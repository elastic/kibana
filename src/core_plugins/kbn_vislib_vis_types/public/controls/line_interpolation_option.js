import { uiModules } from 'ui/modules';
import lineInterpolationOptionTemplate from './line_interpolation_option.html';
const module = uiModules.get('kibana');

module.directive('lineInterpolationOption', function () {
  return {
    restrict: 'E',
    template: lineInterpolationOptionTemplate,
    replace: true
  };
});
