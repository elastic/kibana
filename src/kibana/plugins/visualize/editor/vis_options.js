define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('modules')
  .get('app/visualize')
  .directive('visEditorVisOptions', function (Private, $timeout, $compile) {
    return {
      restrict: 'E',
      template: require('text!plugins/visualize/editor/vis_options.html'),
      replace: true,
      scope: {
        vis: '=',
      },
      link: function ($scope, $el) {
        console.log('vis options', $scope.vis, $scope.vis.aggs);
        $el.append($compile($scope.vis.type.params.editor)($scope));

        $scope.$watchCollection('vis.params', function (params) {
          console.log(params);
        });
      }
    };
  });
});