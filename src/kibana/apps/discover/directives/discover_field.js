define(function (require) {
  var $ = require('jquery');
  var app = require('modules').get('app/discover');
  var html = require('text!../partials/discover_field.html');
  var detailsHtml = require('text!../partials/discover_field_details.html');
  var _ = require('lodash');

  require('directives/css_truncate');
  require('directives/field_name');


  app.directive('discoverField', function ($compile) {
    return {
      restrict: 'E',
      template: html,
      replace: true,
      link: function ($scope, $elem) {
        var detailsElem;

        var init = function () {
          if ($scope.field.details) {
            $scope.toggleDetails($scope.field, true);
          }
        };

        $scope.toggleDetails = function (field, recompute) {
          if (_.isUndefined(field.details) || recompute) {
            // This is inherited from fieldChooser
            $scope.details(field, recompute);

            detailsElem = $(detailsHtml);
            $compile(detailsElem)($scope);
            $elem.append(detailsElem);
          } else {
            delete field.details;
            detailsElem.remove();
          }
        };

        $scope.displayButton = function (field) {
          return field.display ? 'btn-danger' : '';
        };

        init();
      }
    };
  });
});