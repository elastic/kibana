define(function (require) {
  'use strict';
  var RouteManager = function ($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('notFound', {
        url: '/404',
        views: {
          'appview@': {
            templateUrl: '404.html'
          }
        }
      });
    $urlRouterProvider.otherwise('/404');
  };

  return ['$stateProvider', '$urlRouterProvider', RouteManager];
});