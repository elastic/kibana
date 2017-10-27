import { uiModules } from 'ui/modules';
import template from './filter_params_range_editor.html';
import './filter_params_input_type';
import '../../directives/documentation_link';
import '../../directives/focus_on';

const module = uiModules.get('kibana');
module.directive('filterParamsRangeEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      params: '='
    }
  };
});
