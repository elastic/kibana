define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visEditorAgg', function ($compile, $parse, $filter, Private, Notifier) {
    require('plugins/visualize/editor/agg_params');
    require('plugins/visualize/editor/agg_add');

    var _ = require('lodash');
    var $ = require('jquery');
    var aggTypes = Private(require('components/agg_types/index'));
    var advancedToggleHtml = require('text!plugins/visualize/editor/advanced_toggle.html');

    var notify = new Notifier({
      location: 'visAggGroup'
    });

    return {
      restrict: 'A',
      template: require('text!plugins/visualize/editor/agg.html'),
      require: 'form',
      scope: false,
      link: function ($scope, $el, attrs, kbnForm) {
        $scope.$bind('outputAgg', 'outputVis.aggs.byId[agg.id]', $scope);
        $scope.$bind('dual_y', 'attrs.dual_y');
        $scope.editorOpen = !!$scope.agg.brandNew;
        if ($scope.agg.onSecondaryYAxis) {
          $scope.dual_y = $scope.agg.id;
        }

        $scope.$watch('editorOpen', function (open) {
          // make sure that all of the form inputs are "touched"
          // so that their errors propogate
          if (!open) kbnForm.$setTouched();
        });
        $scope.$watchMulti([
          '$index',
          'group.length'
        ], function () {
          $scope.aggIsTooLow = calcAggIsTooLow();
        });

        $scope.$watch('dual_y', function updateAggs(newValue, oldValue) {
          if (newValue) {
            var requiredAgg = _.findWhere($scope.vis.aggs, {'id': $scope.agg.id});
            if (newValue === $scope.agg.id) {
              requiredAgg.onSecondaryYAxis = true;
              $scope.vis.params.hasSecondaryYAxis = true;
            } else {
              requiredAgg.onSecondaryYAxis = false;
            }
          }
        }, true);

        $scope.canBeSecondaryYAxis = function () {
          var schema = $scope.agg.schema;
          var isYAxisMetric = schema.name === 'metric' && schema.title === 'Y-Axis';
          var yAxisCount = $scope.stats.count;
          var isLineGraph = $scope.vis.type.name === 'line';
          var minYAxisCount = 2;
          return isLineGraph && isYAxisMetric && yAxisCount >= minYAxisCount;
        };

        /**
         * Describe the aggregation, for display in the collapsed agg header
         * @return {[type]} [description]
         */
        $scope.describe = function () {
          if (!$scope.agg.type.makeLabel) return '';
          var label = $scope.agg.type.makeLabel($scope.agg);
          return label ? label : '';
        };

        function move(below, agg) {
          _.move($scope.vis.aggs, agg, below, function (otherAgg) {
            return otherAgg.schema.group === agg.schema.group;
          });
        }
        $scope.moveUp = _.partial(move, false);
        $scope.moveDown = _.partial(move, true);

        $scope.remove = function (agg) {
          var aggs = $scope.vis.aggs;
          var yAxisCount = $scope.stats.count;
          var minYAxisCount = 2;
          var schema = $scope.agg.schema;
          var isYAxisMetric = schema.name === 'metric' && schema.title === 'Y-Axis';
          var doesNotHaveMinimumYAxisAfterRemoval = isYAxisMetric && $scope.stats.count <= minYAxisCount;
          if (doesNotHaveMinimumYAxisAfterRemoval || agg.onSecondaryYAxis) {
            $scope.vis.params.hasSecondaryYAxis = false;
            $scope.dual_y = '';
          }

          var index = aggs.indexOf(agg);
          if (index === -1) return notify.log('already removed');

          aggs.splice(index, 1);
        };

        $scope.canRemove = function (aggregation) {
          var metricCount = _.reduce($scope.group, function (count, agg) {
            return (agg.schema.name === aggregation.schema.name) ? ++count : count;
          }, 0);

          // make sure the the number of these aggs is above the min
          return metricCount > aggregation.schema.min;
        };

        function calcAggIsTooLow() {
          if (!$scope.agg.schema.mustBeFirst) {
            return false;
          }

          var firstDifferentSchema = _.findIndex($scope.group, function (agg) {
            return agg.schema !== $scope.agg.schema;
          });

          if (firstDifferentSchema === -1) {
            return false;
          }

          return $scope.$index > firstDifferentSchema;
        }
      }
    };
  });
});
