define(function (require) {
  var _ = require('utils/mixins');

  var app = require('modules').get('app/settings');

  require('services/state');
  require('../services/indices_pattern');
  require('directives/fixed_scroll');

  var navHtml = require('text!../partials/nav.html');

  // Grab the html and controllers for each section
  var sections = {
    indices: require('text!../partials/indices.html'),
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
    redirectTo: '/settings/general'
  })
  .when('/settings/indices/:id?', {
    template: template('indices'),
    resolve: {
      index: function (indexPattern, $route) {
        console.log(indexPattern);
        return indexPattern.get($route.current.params.id);
      }
    },
    reloadOnSearch: false
  });


  app.controller('settings', function ($scope, config, courier, createNotifier, state, $routeParams) {

    $scope.sectionList = sectionList;

    $scope.activeTab = function (tabName) {
      return ($routeParams.section === tabName) ? 'active' : '';
    };

    $scope.$emit('application.load');
  });


});