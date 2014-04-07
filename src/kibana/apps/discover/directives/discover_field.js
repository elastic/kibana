define(function (require) {
  var app = require('modules').get('app/discover');
  var html = require('text!../partials/discover_field.html');
  var _ = require('lodash');

  require('directives/css_truncate');
  require('directives/field_name');


  app.directive('discoverField', function () {
    return {
      restrict: 'E',
      template: html,
      replace: true,
      link: function ($scope) {
        $scope.displayedClass = function (field) {
          return field.display ? 'btn-danger' : '';
        };
      }
    };
  });
});