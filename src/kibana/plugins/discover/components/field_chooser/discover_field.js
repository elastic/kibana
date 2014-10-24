define(function (require) {
  var $ = require('jquery');
  var app = require('modules').get('apps/discover');
  var html = require('text!plugins/discover/components/field_chooser/discover_field.html');
  var detailsHtml = require('text!plugins/discover/components/field_chooser/discover_field_details.html');
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
        var detailScope = $scope.$new();

        var init = function () {
          if ($scope.field.details) {
            $scope.toggleDetails($scope.field, true);
          }
        };

        $scope.toggleDisplay = function (field) {
          // inheritted param to fieldChooser
          $scope.toggle(field.name);
          if (field.display) $scope.increaseFieldCounter(field);

          // we are now displaying the field, kill it's details
          if (field.details) {
            $scope.toggleDetails(field);
          }
        };

        $scope.toggleDetails = function (field, recompute) {
          if (_.isUndefined(field.details) || recompute) {
            // This is inherited from fieldChooser
            $scope.details(field, recompute);

            detailScope.$destroy();
            detailScope = $scope.$new();

            detailsElem = $(detailsHtml);
            $compile(detailsElem)(detailScope);
            $elem.append(detailsElem);
          } else {
            delete field.details;
            detailsElem.remove();
          }
        };

        init();
      }
    };
  });
});