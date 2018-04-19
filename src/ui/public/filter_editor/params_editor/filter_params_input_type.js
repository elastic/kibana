import { uiModules } from '../../modules';
import template from './filter_params_input_type.html';
import '../../directives/validate_date_math';
import '../../directives/validate_ip';
import '../../directives/string_to_number';

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
    },
    link: function (scope) {
      scope.boolOptions = [true, false];
      scope.setDefaultBool = () => {
        if (scope.value == null) {
          scope.value = scope.boolOptions[0];
          scope.onChange({
            value: scope.value
          });
        }
      };
    }
  };
});
