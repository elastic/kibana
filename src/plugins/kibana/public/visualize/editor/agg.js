import 'plugins/kibana/visualize/editor/agg_params';
import 'plugins/kibana/visualize/editor/agg_add';
import _ from 'lodash';
import $ from 'jquery';
import advancedToggleHtml from 'plugins/kibana/visualize/editor/advanced_toggle.html';
import AggTypesIndexProvider from 'ui/agg_types/index';
import uiModules from 'ui/modules';
import aggTemplate from 'plugins/kibana/visualize/editor/agg.html';
uiModules
.get('app/visualize')
.directive('visEditorAgg', function ($compile, $parse, $filter, Private, Notifier) {

  const aggTypes = Private(AggTypesIndexProvider);

  const notify = new Notifier({
    location: 'visAggGroup'
  });

  return {
    restrict: 'A',
    template: aggTemplate,
    require: 'form',
    link: function ($scope, $el, attrs, kbnForm) {
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

      $scope.$on('drag-start', e => {
        $scope.editorWasOpen = $scope.editorOpen;
        $scope.editorOpen = false;
        $scope.$emit('agg-drag-start', $scope.agg);
      });

      $scope.$on('drag-end', e => {
        $scope.editorOpen = $scope.editorWasOpen;
        $scope.$emit('agg-drag-end', $scope.agg);
      });

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
