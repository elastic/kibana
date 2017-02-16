import uiModules from 'ui/modules';
import vislibValueAxesTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series/category_axis.html';
const module = uiModules.get('kibana');

module.directive('vislibCategoryAxis', function () {
  return {
    restrict: 'E',
    template: vislibValueAxesTemplate,
    replace: true,
    link: function ($scope) {
      $scope.rotateOptions = [
        { name: 'horizontal', value: 0 },
        { name: 'vertical', value: 90 },
        { name: 'angled', value: 75 },
      ];

      let lastAxisTitle = '';
      $scope.$watch(() => {
        return $scope.vis.aggs.map(agg => {
          return agg.params.field ? agg.makeLabel() : '';
        }).join();
      }, () => {
        const agg = $scope.vis.aggs.find(agg => agg.schema.name === 'segment');
        const label = agg ? agg.makeLabel() : '';
        if (lastAxisTitle !== label) {
          lastAxisTitle = label;
          $scope.vis.params.categoryAxes[0].title.text = label;
        }
      });
    }
  };
});
