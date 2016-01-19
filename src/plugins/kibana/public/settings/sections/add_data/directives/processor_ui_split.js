const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'split',
  title: 'Split',
  template: '<processor-ui-split></processor-ui-split>',
  getDefinition: function() {
    const self = this;
    return {
      'split' : {
        'processor_id': self.processorId,
        'field' : self.sourceField ? self.sourceField : '',
        'separator' : self.separator ? self.separator : ''
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    const separator = (self.separator) ? self.separator : '?';
    return `[${source}] on '${separator}'`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorUiSplit', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_split.html'),
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

      processor.sourceField = '';
      processor.separator = '';

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.separator', processorUiChanged);
    }
  }
});
