define(function (require) {
  'use strict';
  var RouteManager = function ($stateProvider) {
    $stateProvider
      .state('app', {
        url: '',
        views: {
          'appview@': {
            templateUrl: 'scripts/homepage/homepage.html',
            controller: 'HomepageController as HomepageCtrl'
          }
        }
      });
  };

  return ['$stateProvider', RouteManager];
});