import uiModules from 'ui/modules';
import 'plugins/vis_timefilter/vis_timefilter.less';

uiModules.get('kibana')
.directive('visTimefilterSelection',
  function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('plugins/vis_timefilter/vis_timefilter_selection.html'),
      scope: {
        vis: '=',
      },
      link: function ($scope, $el) {
        var timefilterHandler = $scope.vis.vistime;

        $scope.isShowVisTimefilterSelection = function () {
          return timefilterHandler.isShowVisTimefilterSelection($scope.vis.params);
        };

        $scope.getAvailable = function () {
          return timefilterHandler.getAvailable($scope.vis.params);
        };

        $scope.isSelected = function (timeset) {
          return timefilterHandler.isSelected(timeset, $scope.vis.params);
        };

        $scope.toggle = function (timeset) {
          timefilterHandler.toggleSelection(timeset, $scope.vis.params);
        };

      }
    };
  }
);
