import { uiModules } from 'ui/modules';
import template from './filter_params_input_type.html';
import '../../directives/validate_date_math';
import '../../directives/validate_ip';

const module = uiModules.get('kibana');
module.directive('filterParamsInputType', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      type: '=',
      placeholder: '@',
      value: '=',
      onChange: '&'
    }
  };
});
