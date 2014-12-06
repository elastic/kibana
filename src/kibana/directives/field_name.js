define(function (require) {
  var module = require('modules').get('kibana');
  var $ = require('jquery');
  var _ = require('lodash');
  require('filters/short_dots');

  module.directive('fieldName', function ($compile, $rootScope, $filter) {
    return {
      restrict: 'AE',
      scope: {
        'field': '=',
        'fieldName': '=',
        'fieldType': '='
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
          'fieldName',
          'fieldType',
          'field.rowCount'
        ], function () {

          var type = $scope.field ? $scope.field.type : $scope.fieldType;
          var name = $scope.field ? $scope.field.name : $scope.fieldName;
          var results = $scope.field ? !$scope.field.rowCount && !$scope.field.scripted : false;
          var scripted = $scope.field ? $scope.field.scripted : false;

          var displayName = $filter('shortDots')(name);

          $el
            .text(displayName)
            .attr('title', name)
            .toggleClass('no-results', results)
            .toggleClass('scripted', scripted)
            .prepend(typeIcon(type));
        });
      }
    };
  });
});