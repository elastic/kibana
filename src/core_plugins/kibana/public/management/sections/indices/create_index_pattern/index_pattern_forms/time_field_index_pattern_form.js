import uiModules from 'ui/modules';
import template from './time_field_index_pattern_form.html';

const app = uiModules.get('kibana');

app.directive('timeFieldIndexPatternForm', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    scope: {
      refreshFieldList: '=',
      canExpandIndices: '=',
    },
    controllerAs: 'timeFieldIndexPatternForm',
    bindToController: true,
    controller: class TimeFieldIndexPatternFormController {
      constructor() {
        this.index = {
          nameIsPattern: false,
          isTimeBased: false,
          name: '',
          defaultName: '',
          nameInterval: {
            name: '',
          },
          fetchFieldsError: '',
          dateFields: '',
          timeField: '',
          notExpandable: false,
        };
      }
    }
  };
});
