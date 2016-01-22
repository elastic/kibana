const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_type_registry').register({
  typeId: 'gsub',
  title: 'Gsub',
  sourceField: '',
  pattern: '',
  replacement: '',
  getDefinition: function() {
    const self = this;
    return {
      'gsub' : {
        'processor_id': self.processorId,
        'field' : self.sourceField ? self.sourceField : '',
        'pattern' : self.pattern ? self.pattern : '',
        'replacement' : self.replacement ? self.replacement : ''
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    return `[${source}] - '${self.pattern}' -> '${self.replacement}'`;
  }
});

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiGsub', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_gsub.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function consumeNewInputObject() {
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function processorUiChanged() {
        pipeline.dirty = true;
      }

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.pattern', processorUiChanged);
      $scope.$watch('processor.replacement', processorUiChanged);
    }
  }
});
