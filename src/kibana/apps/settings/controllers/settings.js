define(function (require) {
  var _ = require('utils/mixins');

  var app = require('modules').get('app/settings');

  require('services/state');
  require('../services/patterns');
  require('directives/fixed_scroll');

  var navHtml = require('text!../partials/nav.html');

  // Grab the html and controllers for each section
  var sections = {
    indices: require('text!../partials/indices.html'),
    newIndex: require('text!../partials/indices.html'),

  };

  // Order them correctly in the nav
  var sectionList = ['indices'];

  var template = function (params) {
    return '' +
        '<div ng-controller="settings">' +
          navHtml +
          sections[params] +
        '</div>';
  };

  require('routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  })
  .when('/settings/indices', {
    template: template('indices'),
    reloadOnSearch: false
  })
  .when('/settings/indices/:id?', {
    template: template('indices'),
    /*
    resolve: {
      index: function (indexPatterns, $route) {
        console.log(indexPatterns);
        return indexPatterns.get($route.current.params.id);
      }
    },
    */
    reloadOnSearch: false
  });


  app.controller('settings', function ($scope, config, courier, createNotifier, state, $route, $routeParams, es) {

    console.log(config);
    console.log(es);

    var init = function () {
      $scope.indices = {};
      if (!$routeParams.id) {
        $scope.indices.view = 'addPattern';
      }
    };

    $scope.addPattern = function (pattern) {
      console.log('adding');
      var source = courier.createSource('search').index(pattern).getFields();
      console.log(source);
    };

    $scope.sectionList = sectionList;
    $scope.activeTab = function (tabName) {
      return false;
      //return ($routeParams.section === tabName) ? 'active' : '';
    };

    init();

    $scope.$emit('application.load');
  });


});