const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_type_registry').register({
  typeid: 'append',
  title: 'Append',
  template: '<processor-ui-append></processor-ui-append>',
  targetField: '',
  values: [],
  getDefinition: function() {
    const self = this;
    return {
      'append' : {
        'processor_id': self.processorId,
        'field' : self.targetField ? self.targetField : '',
        'value': self.values
      }
    };
  },
  getDescription: function() {
    const self = this;

    const target = (self.targetField) ? self.targetField : '?';
    return `[${target}]`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorUiAppend', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_append.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;

      function processorUiChanged() {
        $rootScope.$broadcast('processor_ui_changed', { processor: processor });
      }

      function splitValues(delimitedList) {
        return delimitedList.split('\n');
      }

      function joinValues(valueArray) {
        return valueArray.join('\n');
      }

      function updateValues() {
        processor.values = splitValues($scope.values);
      }

      $scope.values = joinValues(processor.values);

      $scope.$watch('values', updateValues);

      $scope.$watch('processor.targetField', processorUiChanged);
      $scope.$watchCollection('processor.values', processorUiChanged);
    }
  }
});

