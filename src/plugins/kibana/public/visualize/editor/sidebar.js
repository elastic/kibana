import _ from 'lodash';
import 'plugins/kibana/visualize/editor/agg_group';
import 'plugins/kibana/visualize/editor/vis_options';
require('ui/modules')
.get('app/visualize')
.directive('visEditorSidebar', function () {


  return {
    restrict: 'E',
    template: require('plugins/kibana/visualize/editor/sidebar.html'),
    scope: true,
    controllerAs: 'sidebar',
    controller: function ($scope) {
      $scope.$bind('vis', 'editableVis');
      $scope.$bind('outputVis', 'vis');
      this.section = _.get($scope, 'vis.type.requiresSearch') ? 'data' : 'options';
    }
  };
});
