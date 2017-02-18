import uiModules from 'ui/modules';
import template from './non_time_field_index_pattern_form.html';

const app = uiModules.get('kibana');

app.directive('nonTimeFieldIndexPatternForm', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    scope: {
      index: '=',
    },
    controllerAs: 'nonTimeFieldIndexPatternForm',
    bindToController: true,
    controller: class NonTimeFieldIndexPatternFormController {
    }
  };
});
