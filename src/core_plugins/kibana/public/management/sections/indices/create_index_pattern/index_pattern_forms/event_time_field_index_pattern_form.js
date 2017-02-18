import uiModules from 'ui/modules';
import template from './event_time_field_index_pattern_form.html';

const app = uiModules.get('kibana');

app.directive('eventTimeFieldIndexPatternForm', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    scope: {
      index: '=',
      intervals: '=',
      samples: '=',
      moreSamples: '=',
    },
    controllerAs: 'eventTimeFieldIndexPatternForm',
    bindToController: true,
    controller: class EventTimeFieldIndexPatternFormController {
    }
  };
});
