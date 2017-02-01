import uiModules from 'ui/modules';
import tagCloudVisParamsTemplate from 'plugins/tagcloud/tag_cloud_vis_params.html';
import noUiSlider from 'no-ui-slider';
import 'no-ui-slider/css/nouislider.css';
import 'no-ui-slider/css/nouislider.pips.css';
import 'no-ui-slider/css/nouislider.tooltips.css';

uiModules.get('kibana/table_vis')
  .directive('tagcloudVisParams', function () {
    return {
      restrict: 'E',
      template: tagCloudVisParamsTemplate,
      link: function ($scope, $element) {
        const sliderContainer = $element[0];
        const slider = sliderContainer.querySelector('.tag-cloud-fontsize-slider');
        noUiSlider.create(slider, {
          start: [$scope.vis.params.minFontSize, $scope.vis.params.maxFontSize],
          connect: true,
          tooltips: true,
          step: 1,
          range: { 'min': 1, 'max': 100 },
          format: { to: (value) => parseInt(value) + 'px', from: value => parseInt(value) }
        });
        slider.noUiSlider.on('change', function () {
          const fontSize = slider.noUiSlider.get();
          $scope.vis.params.minFontSize = parseInt(fontSize[0], 10);
          $scope.vis.params.maxFontSize = parseInt(fontSize[1], 10);
          $scope.$apply();
        });
      }
    };
  });
