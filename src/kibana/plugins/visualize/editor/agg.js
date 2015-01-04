define(function (require) {
  require('modules')
  .get('app/visualize', ['ui.select'])
  .directive('visEditorAgg', function ($compile, $parse, Private, Notifier) {
    var _ = require('lodash');
    var $ = require('jquery');
    var aggTypes = Private(require('components/agg_types/index'));
    var aggSelectHtml = require('text!plugins/visualize/editor/agg_select.html');
    var advancedToggleHtml = require('text!plugins/visualize/editor/advanced_toggle.html');
    require('angular-ui-select');

    require('plugins/visualize/editor/agg_params');
    require('filters/match_any');

    var notify = new Notifier({
      location: 'visAggGroup'
    });

    return {
      restrict: 'E',
      replace: true,
      template: require('text!plugins/visualize/editor/agg.html'),
      scope: {
        vis: '=',
        agg: '=',
        $index: '=',
        group: '=',
        groupName: '=',
        groupMin: '='
      },
      link: function ($scope, $el) {
        $scope.editorOpen = $scope.agg.brandNew;

        $scope.$watchMulti([
          '$index',
          'group.length'
        ], function () {
          var i = $scope.$index;
          $scope.$first = i === 0;
          $scope.$last = i === $scope.group.length - 1;
          $scope.aggIsTooLow = calcAggIsTooLow();
        });

        /**
         * Describe the aggregation, for display in the collapsed agg header
         * @return {[type]} [description]
         */
        $scope.describe = function () {
          if (!$scope.agg.type.makeLabel) return '';
          var label = $scope.agg.type.makeLabel($scope.agg);
          return label ? label : '';
        };

        /**
         * Describe the errors in this agg
         * @return {[type]} [description]
         */
        $scope.describeError = function () {
          var count = _.reduce($scope.aggForm.$error, function (count, controls, errorType) {
            return count + _.size(controls);
          }, 0);

          return count + ' Error' + (count > 1 ? 's' : '');
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

          var index = aggs.indexOf(agg);
          if (index === -1) return notify.log('already removed');

          aggs.splice(index, 1);
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