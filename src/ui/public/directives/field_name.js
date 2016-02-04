import 'ui/filters/short_dots';
define(function (require) {
  var module = require('ui/modules').get('kibana');

  module.directive('fieldName', function ($compile, $rootScope, $filter) {
    return {
      restrict: 'AE',
      scope: {
        'field': '=',
        'fieldName': '=',
        'fieldType': '='
      },
      link: function ($scope, $el) {

        var typeIcon = function (fieldType) {
          switch (fieldType) {
            case 'source':
              return '<i class="fa oi-file-text-o "></i>';
            case 'string':
              return '<i><strong>t</strong></i>';
            case 'murmur3':
              return '<i><strong>h</strong></i>';
            case 'number':
              return '<i><strong>#</strong></i>';
            case 'date':
              return '<i class="fa oi-clock-o"></i>';
            case 'ip':
              return '<i class="fa oi-laptop"></i>';
            case 'geo_point':
              return '<i class="fa oi-globe"></i>';
            case 'boolean':
              return '<i class="fa oi-adjust"></i>';
            case 'conflict':
              return '<i class="fa oi-warning"></i>';
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
