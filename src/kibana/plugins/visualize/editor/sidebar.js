define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visEditorSidebar', function () {
    var _ = require('lodash');

    require('plugins/visualize/editor/agg_group');
    require('plugins/visualize/editor/vis_options');

    return {
      restrict: 'E',
      template: require('text!plugins/visualize/editor/sidebar.html'),
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