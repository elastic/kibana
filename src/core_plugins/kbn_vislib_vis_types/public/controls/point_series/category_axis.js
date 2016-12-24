import _ from 'lodash';
import uiModules from 'ui/modules';
import vislibValueAxesTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series/category_axis.html';
const module = uiModules.get('kibana');

module.directive('vislibCategoryAxis', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: vislibValueAxesTemplate,
    replace: true,
    link: function ($scope) {
      function mapPosition(position) {
        switch (position) {
          case 'bottom': return 'left';
          case 'top': return 'right';
          case 'left': return 'bottom';
          case 'right': return 'top';
        }
      }

      $scope.$watch('vis.params.categoryAxes[0].position', position => {
        const categoryAxisIsHorizontal = ['top', 'bottom'].includes(position);
        $scope.vis.params.valueAxes.forEach(axis => {
          const axisIsHorizontal = ['top', 'bottom'].includes(axis.position);
          if (axisIsHorizontal === categoryAxisIsHorizontal) {
            axis.position = mapPosition(axis.position);
          }
        });
      });

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
