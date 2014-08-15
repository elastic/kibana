define(function (require) {
  require('modules')
  .get('apps/visualize')
  .directive('visEditorAggGroup', function (Private) {
    require('apps/visualize/editor/agg');
    require('apps/visualize/editor/nesting_indicator');

    var eachGroupHtml = require('text!apps/visualize/editor/agg_group.html');
    var AggConfig = Private(require('components/vis/_agg_config'));

    return {
      restrict: 'E',
      template: require('text!apps/visualize/editor/agg_group.html'),
      scope: {
        vis: '=',
        schemas: '=',
        group: '=',
        groupName: '='
      },
      link: function ($scope) {

        // "sub-scope" for the add form to use
        $scope.addForm = {};

        $scope.$watchMulti([
          'schemas',
          'group.length'
        ], function () {
          var stats = $scope.stats = {
            min: 0,
            max: 0,
            count: $scope.group ? $scope.group.length : 0
          };

          if (!$scope.schemas) return;

          $scope.schemas.forEach(function (schema) {
            stats.min += schema.min;
            stats.max += schema.max;
          });
        });

        $scope.$watchCollection('group', function () {
          $scope.availableSchema = $scope.schemas.filter(function (schema) {
            var count = 0;

            if ($scope.group) {
              count = $scope.group.reduce(function (count, aggConfig) {
                if (aggConfig.schema === schema) count += 1;
                return count;
              }, 0);
            }

            if (count < schema.max) return true;
          });
        });

        $scope.createUsingSchema = function (schema) {
          $scope.addForm = {};

          $scope.vis.aggs.push(new AggConfig($scope.vis, {
            schema: schema
          }));
        };
      }
    };

  });
});