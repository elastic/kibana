import { uiModules } from 'ui/modules';
import template from './filter_params_range_editor.html';

const module = uiModules.get('kibana');
module.directive('filterParamsRangeEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      params: '=',
      onChange: '&'
    }
  };
});
