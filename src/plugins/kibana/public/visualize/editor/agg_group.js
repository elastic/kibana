const _ = require('lodash');

define(function (require) {
  require('ui/modules')
  .get('app/visualize')
  .directive('visEditorAggGroup', function (Private) {
    require('plugins/kibana/visualize/editor/agg');
    require('plugins/kibana/visualize/editor/agg_add');
    require('plugins/kibana/visualize/editor/nesting_indicator');

    return {
      restrict: 'E',
      template: require('plugins/kibana/visualize/editor/agg_group.html'),
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
          });

          $scope.availableSchema = $scope.schemas.filter(function (schema) {
            const count = _.where($scope.group, { schema }).length;
            if (count < schema.max) return true;
          });
        });
      }
    };

  });
});
