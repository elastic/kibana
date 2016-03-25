import 'ui/filters/short_dots';
import uiModules from 'ui/modules';
var module = uiModules.get('kibana');

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
            return '<i title="source" class="fa fa-file-text-o "></i>';
          case 'string':
            return '<i title="string"><strong>t</strong></i>';
          case 'murmur3':
            return '<i title="murmur3"><strong>h</strong></i>';
          case 'number':
            return '<i title="number"><strong>#</strong></i>';
          case 'date':
            return '<i title="date" class="fa fa-clock-o"></i>';
          case 'ip':
            return '<i title="ip" class="fa fa-laptop"></i>';
          case 'geo_point':
            return '<i title="geo_point" class="fa fa-globe"></i>';
          case 'boolean':
            return '<i title="boolean" class="fa fa-adjust"></i>';
          case 'conflict':
            return '<i title="conflict" class="fa fa-warning"></i>';
          default:
            return '<i title="unknown"><strong>?</strong></i>';
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
