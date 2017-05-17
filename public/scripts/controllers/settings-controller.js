app.controller('settingsCtr', ['$scope', '$stateParams', '$filter', '$state', '$window', '$timeout', 'bookmarkService', 'pubSubService', 'dataService', function($scope, $stateParams, $filter, $state, $window, $timeout, bookmarkService, pubSubService, dataService) {
    console.log('Hello settingsCtr......', $stateParams);
    $scope.form = [false, false, false, false];
    $scope.passwordOrgin = "";
    $scope.passwordNew1 = "";
    $scope.passwordNew2 = "";
    $scope.user = {};
    $scope.tagCnt = 0;
    $scope.bookmarkCnt = 0;
    $scope.loadShowStyle = false;
    $scope.form[($stateParams && $stateParams.formIndex) || 0] = true;
    $scope.key = '';
    $scope.url = '';
    $scope.quickUrl = {};

    $scope.changeForm = function(index) {
        console.log("changeForm = ", index);
        $scope.form = $scope.form.map(() => false);
        $scope.form[index] = true;

        if (index == 0 || index == 1 || index == 4) {
            $scope.loadShowStyle = true;
            bookmarkService.userInfo({})
                .then((data) => {
                    $scope.user = data;
                    if (index == 0) {
                        updateShowStyle(($scope.user && $scope.user.show_style) || 'navigate');
                        $scope.loadShowStyle = false;
                    }
                    if (index == 4) {
                        $scope.quickUrl = JSON.parse($scope.user.quick_url || '{}');
                    }
                })
                .catch((err) => {
                    console.log(err);
                    toastr.error('获取信息失败。错误信息：' + JSON.stringify(err), "错误");
                    $scope.loadShowStyle = false;
                });
        }

        if (index == 1) {
            bookmarkService.getTags({})
                .then((data) => {
                    $scope.tagCnt = data.length;
                    $scope.bookmarkCnt = 0;
                    data.forEach((tag) => {
                        $scope.bookmarkCnt += tag.cnt;
                    })
                })
                .catch((err) => {
                    console.log('getTags err', err);
                });
        }
    }

    $scope.changeForm($scope.form.indexOf(true)); // 马上调用一次

    $scope.resetPassword = function() {
        if (!$scope.passwordOrgin || !$scope.passwordNew1 || !$scope.passwordNew2) {
            toastr.error('原密码跟新密码不能为空', "错误");
            return;
        }

        if ($scope.passwordNew1 == $scope.passwordNew2) {
            var parmes = {
                passwordNew: $scope.passwordNew1,
                passwordOrgin: $scope.passwordOrgin,
            };

            bookmarkService.resetPassword(parmes)
                .then((data) => {
                    if (data.retCode == 0) {
                        toastr.success('密码更新成功，请重新登陆！', "提示");
                        // 注销登陆
                        bookmarkService.logout({})
                            .then((data) => {
                                console.log('logout..........', data)
                                pubSubService.publish('Common.menuActive', {
                                    login: false,
                                    index: dataService.NotLoginIndexLogin
                                });
                                $state.go('login', {})
                            })
                            .catch((err) => console.log('logout err', err));
                    } else {
                        toastr.error('密码更新失败。错误信息：' + data.msg, "错误");
                    }
                })
                .catch((err) => {
                    toastr.error('密码更新失败。错误信息：' + JSON.stringify(err), "错误");
                });
        } else {
            toastr.error('新密码两次输入不一致', "错误");
        }
    }

    $scope.updateDefaultShowStyle = function(showStyle) {
        console.log(showStyle)
        var parmes = {
            showStyle: showStyle,
        };
        bookmarkService.updateShowStyle(parmes)
            .then((data) => {
                if (data.retCode == 0) {
                    toastr.success('书签默认显示风格配置更新成功', "提示");
                } else {
                    toastr.error('书签默认显示风格配置。错误信息：' + data.msg, "错误");
                }
            })
            .catch((err) => {
                toastr.error('书签默认显示风格配置。错误信息：' + JSON.stringify(err), "错误");
            });
    }


    $scope.quickKey = function(key) {
        key = key.toUpperCase();
        console.log('key = ', key);
        if (!((key >= 'A' && key <= 'Z') || (key >= '1' && key <= '9'))) {
            key = '';
            toastr.warning('快捷键只能是数字1 ~ 9或者字母a ~ z，字母不区分大小写。', "警告");
        }
        $timeout(function() {
            $scope.key = key;
        });
    }

    $scope.addQuickUrl = function(){
        if (!/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/.test($scope.url)) {
            toastr.warning($scope.url + '<br/>检撤到您的书签链接非法，是否忘记加http或者https了？建议直接从打开浏览器地址栏复制出来直接粘贴到输入框。', "警告");
            $scope.url = '';
            return;
        }
        if (!(($scope.key >= 'A' && $scope.key <= 'Z') || ($scope.key >= 'a' && $scope.key <= 'z') || ($scope.key >= '1' && $scope.key <= '9'))) {
            toastr.warning('快捷键只能是数字1 ~ 9或者字母a ~ z，字母不区分大小写。', "警告");
            $scope.key = '';
            return;
        }

        if (dataService.forbidQuickKey[$scope.key]) {
            toastr.warning('快捷键' + $scope.key + '，已经设置为系统：' + dataService.forbidQuickKey[$scope.key] + '。无法使用该快捷键', "警告");
            $scope.key = '';
            return;
        }

        if ($scope.quickUrl[$scope.key]) {
            toastr.warning('快捷键：' + $scope.key + '，已经设置为链接为：' + $scope.quickUrl[$scope.key] + '。您可以先删除再添加。', "警告");
            $scope.key = '';
            return;
        }

        $scope.key = $scope.key.toUpperCase();
        $scope.quickUrl[$scope.key] = $scope.url;

        console.log(JSON.stringify($scope.quickUrl));

        saveQuickUrl();
        $scope.url = '';
        $scope.key = '';
    }

    $scope.delUrl = function(key) {
        delete $scope.quickUrl[key];
        saveQuickUrl();
    }

    function updateShowStyle(showStyle) {
        setTimeout(function() {
            if (showStyle) {
                $('.js-default-show-style' + ' .radio.checkbox').checkbox('set unchecked');
                $('.js-radio-default-' + showStyle).checkbox('set checked');
            }
        }, 100)
    }

    setTimeout(function() {
        $("#fileuploader").uploadFile({
            url: "/api/uploadBookmarkFile",
            multiple: false,
            dragDrop: true,
            fileName: "bookmark",
            acceptFiles: "text/html",
            maxFileSize: 10 * 1024 * 1024, // 最大10M
            dragdropWidth: "100%",
            onSuccess: function(files, response, xhr, pd) {
                toastr.success('文件上传成功，3秒钟自动跳转到书签页面', "提示");
                setTimeout(function() {
                    pubSubService.publish('Common.menuActive', {
                        login: true,
                        index: dataService.LoginIndexBookmarks
                    });
                    $state.go('bookmarks', {})
                }, 3000);

            },
        });
        $(".ui.pointing.menu .item").removeClass("selected");
    }, 500);

    pubSubService.publish('Common.menuActive', {
        login: true,
        index: dataService.LoginIndexSettings
    });

    function saveQuickUrl() {
        var parmes = {
            quickUrl: JSON.stringify($scope.quickUrl),
        };
        bookmarkService.updateQuickUrl(parmes)
            .then((data) => {
                if (data.retCode == 0) {
                    toastr.success('全局快捷键更新成功', "提示");
                    pubSubService.publish('Settings.quickUrl', {
                        quickUrl: $scope.quickUrl
                    });
                } else {
                    toastr.error('全局快捷键更新失败。错误信息：' + data.msg, "错误");
                }
            })
            .catch((err) => {
                toastr.error('全局快捷键更新失败。错误信息：' + JSON.stringify(err), "错误");
            });
    }

    transition();
    function transition() {
        var className = 'js-segment-settings';
        $('.' + className).transition('hide');
        $('.' + className).transition({
            animation: dataService.animation(),
            duration: 500,
        });
    }

}]);
