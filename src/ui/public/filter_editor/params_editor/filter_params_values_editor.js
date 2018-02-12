
import { uiModules } from 'ui/modules';
import template from './filter_params_values_editor.html';
import { filterParamsValuesController } from './filter_params_values_controller';
import './filter_params_input_type';

const module = uiModules.get('kibana');
module.directive('filterParamsValuesEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      params: '='
    },
    controllerAs: 'filterParamsValuesEditor',
    controller: filterParamsValuesController
  };
});
