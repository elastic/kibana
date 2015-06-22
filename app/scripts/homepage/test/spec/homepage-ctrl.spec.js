define([
    'scripts/homepage/homepageModule',
    'angular',
    'angular-mocks'
],
    function (HomepageModule) {
        'use strict';

        var moduleName = HomepageModule();

        describe('Controller: HomepageController', function () {

            var HomepageController;

            beforeEach(
                function () {
                    module(moduleName);
                    inject(function ($controller) {
                        HomepageController = $controller("HomepageController", {});
                    });
                }
            );

            it('should attach a list of awesomeThings to the scope', function () {
                expect(HomepageController.test).toBeTruthy();
            });

            it('should attach a list of awesomeThings to the scope', function () {
                expect(HomepageController.test).toBeTruthy();
            });
        });
    });