define(function (require) {
  require('ui/modules')
  .get('app/visualize')
  .directive('visEditorAgg', function ($compile, $parse, $filter, Private, Notifier) {
    require('plugins/kibana/visualize/editor/agg_params');
    require('plugins/kibana/visualize/editor/agg_add');

    const _ = require('lodash');
    const $ = require('jquery');
    const aggTypes = Private(require('ui/agg_types/index'));
    const advancedToggleHtml = require('plugins/kibana/visualize/editor/advanced_toggle.html');

    const notify = new Notifier({
      location: 'visAggGroup'
    });

    return {
      restrict: 'A',
      template: require('plugins/kibana/visualize/editor/agg.html'),
      require: 'form',
      link: function ($scope, $el, attrs, kbnForm) {
        $scope.$bind('outputAgg', 'outputVis.aggs.byId[agg.id]', $scope);
        $scope.editorOpen = !!$scope.agg.brandNew;

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

        /**
         * Describe the aggregation, for display in the collapsed agg header
         * @return {[type]} [description]
         */
        $scope.describe = function () {
          if (!$scope.agg.type.makeLabel) return '';
          const label = $scope.agg.type.makeLabel($scope.agg);
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
          const aggs = $scope.vis.aggs;

          const index = aggs.indexOf(agg);
          if (index === -1) return notify.log('already removed');

          aggs.splice(index, 1);
        };

        $scope.canRemove = function (aggregation) {
          const metricCount = _.reduce($scope.group, function (count, agg) {
            return (agg.schema.name === aggregation.schema.name) ? ++count : count;
          }, 0);

          // make sure the the number of these aggs is above the min
          return metricCount > aggregation.schema.min;
        };

        function calcAggIsTooLow() {
          if (!$scope.agg.schema.mustBeFirst) {
            return false;
          }

          const firstDifferentSchema = _.findIndex($scope.group, function (agg) {
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
