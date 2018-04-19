import { uiModules } from '../../modules';
import template from './filter_params_range_editor.html';
import './filter_params_input_type';
import '../../directives/documentation_href';
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
