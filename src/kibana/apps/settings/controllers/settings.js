define(function (require) {
  var _ = require('utils/mixins');

  var app = require('modules').get('app/settings');

  require('services/state');
  require('directives/fixed_scroll');

  var navHtml = require('text!../partials/nav.html');

  // Grab the html and controllers for each section
  var sections = {
    //general: require('text!../sections/general/index.html'),
    indices: require('text!../sections/indices/index.html'),
  };
  //require('../sections/general/index.js');
  require('kibana/apps/settings/sections/indices/index.js');


  // Order them correctly in the nav
  var sectionList = ['general', 'indices'];

  require('routes')
  .when('/settings', {
    redirectTo: '/settings/general'
  })
  .when('/settings/:section?', {
    template: function (params) {
      return '' +
        '<div ng-controller="settings">' +
          navHtml +
          sections[params.section] +
        '</div>';
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