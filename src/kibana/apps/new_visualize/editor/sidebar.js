define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visEditorSidebar', function () {
    var _ = require('lodash');

    require('apps/visualize/editor/agg_group');

    return {
      restrict: 'E',
      template: require('text!apps/new_visualize/editor/sidebar.html'),
      replace: true,
      scope: {
        vis: '=',
        savedVis: '=',
        apply: '&'
      },
      link: function ($scope, $el) {
        if (!_.isFunction($scope.apply)) {
          throw new Error('expected apply attribute to be an expression');
        }

        var vis = $scope.vis;

        $scope.$watch(function () {
          return vis.getState();
        }, function (newState, prevState) {
          // only run on actual updates, this is true on the first run.
          if (newState === prevState) return;

          $scope.stateDirty = true;
        }, true);

        $scope.doApply = function () {
          if (_.isFunction($scope.apply)) {
            $scope.stateDirty = false;
            $scope.apply();
          }
        };
      }
    };
  });
});