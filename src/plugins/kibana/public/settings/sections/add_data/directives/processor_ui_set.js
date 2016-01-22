const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_type_registry').register({
  typeId: 'set',
  title: 'Set',
  targetField: '',
  getDefinition: function() {
    const self = this;
    return {
      'set' : {
        'processor_id': self.processorId,
        'field' : self.targetField ? self.targetField : '',
        'value': self.value ? self.value : ''
      }
    };
  },
  getDescription: function() {
    const self = this;

    const target = (self.targetField) ? self.targetField : '?';
    return `[${target}]`;
  }
});

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiSet', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_set.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function processorUiChanged() {
        pipeline.dirty = true;
      }

      $scope.$watch('processor.targetField', processorUiChanged);
      $scope.$watch('processor.value', processorUiChanged);
    }
  }
});
