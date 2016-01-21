const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_type_registry').register({
  typeid: 'lowercase',
  title: 'Lowercase',
  template: '<processor-ui-lowercase></processor-ui-lowercase>',
  sourceField: '',
  getDefinition: function() {
    const self = this;
    return {
      'lowercase' : {
        'processor_id': self.processorId,
        'field' : self.sourceField ? self.sourceField : ''
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    return `[${source}]`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorUiLowercase', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_lowercase.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;

      function consumeNewInputObject() {
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function processorUiChanged() {
        $rootScope.$broadcast('processor_ui_changed', { processor: processor });
      }

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });
    }
  }
});
