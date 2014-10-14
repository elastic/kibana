define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visEditorSidebar', function () {
    var _ = require('lodash');

    require('apps/visualize/editor/agg_group');

    return {
      restrict: 'E',
      template: require('text!apps/visualize/editor/sidebar.html'),
      replace: true,
      scope: {
        vis: '=',
        savedVis: '=',
        apply: '&',
        reset: '&'
      },
      link: function ($scope) {
        $scope.hideErrors = true;
        $scope.dontApply = function () {
          $scope.hideErrors = false;
        };
      }
    };
  });
});