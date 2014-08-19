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
        apply: '&',
        reset: '&'
      },
      link: function ($scope, $el) {
        var vis = $scope.vis;
        var discardingChanges = false;

        $scope.$watch(function () {
          return vis.getState();
        }, function (newState, prevState) {
          // only run on actual updates, this is true on the first run.
          if (newState === prevState) return;

          if (discardingChanges) {
            discardingChanges = false;
            $scope.stateDirty = false;
          } else {
            $scope.stateDirty = true;
          }
        }, true);

        $scope.doApply = function () {
          $scope.stateDirty = false;
          $scope.apply();
        };

        $scope.doReset = function () {
          // since we don't control the "actual" vis object, we
          // have to set this flag and wait for the next change
          // to propogate
          discardingChanges = true;
          $scope.reset();
        };
      }
    };
  });
});