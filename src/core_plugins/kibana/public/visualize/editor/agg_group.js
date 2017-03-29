import _ from 'lodash';
import 'plugins/kibana/visualize/editor/agg';
import 'plugins/kibana/visualize/editor/agg_add';
import 'plugins/kibana/visualize/editor/nesting_indicator';
import uiModules from 'ui/modules';
import aggGroupTemplate from 'plugins/kibana/visualize/editor/agg_group.html';

uiModules
.get('app/visualize')
.directive('visEditorAggGroup', function () {

  return {
    restrict: 'E',
    template: aggGroupTemplate,
    scope: true,
    link: function ($scope, $el, attr) {
      $scope.groupName = attr.groupName;
      $scope.$bind('group', 'vis.aggs.bySchemaGroup["' + $scope.groupName + '"]');
      $scope.$bind('schemas', 'vis.type.schemas["' + $scope.groupName + '"]');

      $scope.$watchMulti([
        'schemas',
        '[]group'
      ], function () {
        const stats = $scope.stats = {
          min: 0,
          max: 0,
          count: $scope.group ? $scope.group.length : 0
        };

        if (!$scope.schemas) return;

        $scope.schemas.forEach(function (schema) {
          stats.min += schema.min;
          stats.max += schema.max;
          stats.deprecate = schema.deprecate;
        });

        $scope.availableSchema = $scope.schemas.filter(function (schema) {
          const count = _.where($scope.group, { schema }).length;
          if (count < schema.max) return true;
        });
      });

      $scope.$on('agg-drag-start', () => $scope.dragging = true);
      $scope.$on('agg-drag-end', () => {
        $scope.dragging = false;

        //the aggs have been reordered in [group] and we need
        //to apply that ordering to [vis.aggs]
        const indexOffset = $scope.vis.aggs.indexOf($scope.group[0]);
        _.forEach($scope.group, (agg, index) => {
          _.move($scope.vis.aggs, agg, indexOffset + index);
        });
      });
    }
  };

});
