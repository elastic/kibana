const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'convert',
  title: 'Convert',
  template: '<processor-ui-convert></processor-ui-convert>',
  getDefinition: function() {
    const self = this;
    return {
      'convert' : {
        'processor_id': self.processorId,
        'field' : self.sourceField ? self.sourceField : '',
        'type' : self.type ? self.type : ''
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    const type = (self.type) ? self.type : '?';
    return `[${source}] to ${type}`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorUiConvert', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_convert.html'),
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
      $scope.types = ['integer', 'float', 'string', 'boolean'];

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.type', processorUiChanged);
    }
  }
});
