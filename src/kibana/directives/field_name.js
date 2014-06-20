define(function (require) {
  var module = require('modules').get('kibana/directives');
  var $ = require('jquery');
  var _ = require('lodash');

  module.directive('fieldName', function ($compile, $rootScope) {
    return {
      restrict: 'E',
      scope: {
        field: '='
      },
      link: function ($scope, $el, attrs) {

        var typeIcon = function (fieldType) {
          switch (fieldType) {
          case 'source':
            return '<i class="fa fa-file-text-o "></i>';
          case 'string':
            return '<i><strong>t</strong></i>';
          case 'number':
            return '<i><strong>#</strong></i>';
          case 'date':
            return '<i class="fa fa-clock-o"></i>';
          case 'ip':
            return '<i class="fa fa-laptop"></i>';
          case 'geo_point':
            return '<i class="fa fa-globe"></i>';
          case 'conflict':
            return '<i class="fa fa-warning"></i>';
          default:
            return '<i><strong>?</strong></i>';
          }
        };

        $rootScope.$watchMulti.call($scope, [
          'field',
          'field.rowCount'
        ], function () {
          $el
            .text($scope.field.name)
            .toggleClass('no-results', !$scope.field.rowCount)
            .prepend(typeIcon($scope.field.type));
        });
      }
    };
  });
});