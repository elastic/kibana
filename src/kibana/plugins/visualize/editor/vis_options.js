define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visEditorVisOptions', function (Private) {
    return {
      restrict: 'E',
      template: require('text!plugins/visualize/editor/vis_options.html'),
      scope: {
        vis: '=',
      },
      link: function ($scope) {
        console.log('vis options', $scope.vis, $scope.vis.setState);
      }
    };
  });
});