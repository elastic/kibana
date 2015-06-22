'use strict';
window.angular.module('demoModule', ['LocalStorageModule'])
.config(function(localStorageServiceProvider){
  localStorageServiceProvider.setPrefix('demoPrefix');
  // localStorageServiceProvider.setStorageCookieDomain('example.com');
  // localStorageServiceProvider.setStorageType('sessionStorage');
})
.controller('DemoCtrl',
  function($scope, localStorageService) {
    $scope.localStorageDemo = localStorageService.get('localStorageDemo');

    $scope.$watch('localStorageDemo', function(value){
      localStorageService.set('localStorageDemo',value);
      $scope.localStorageDemoValue = localStorageService.get('localStorageDemo');
    });

    $scope.storageType = 'Local storage';

    if (localStorageService.getStorageType().indexOf('session') >= 0) {
      $scope.storageType = 'Session storage';
    }

    if (!localStorageService.isSupported) {
      $scope.storageType = 'Cookie';
    }

    $scope.$watch(function(){
      return localStorageService.get('localStorageDemo');
    }, function(value){
      $scope.localStorageDemo = value;
    });

    $scope.clearAll = localStorageService.clearAll;
  }
);
