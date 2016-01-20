const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'set',
  title: 'Set',
  template: '<processor-ui-set></processor-ui-set>',
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

//scope.processor is attached by the process_container.
app.directive('processorUiSet', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_set.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;

      function processorUiChanged() {
        $rootScope.$broadcast('processor_ui_changed', { processor: processor });
      }

      $scope.$watch('processor.targetField', processorUiChanged);
      $scope.$watch('processor.value', processorUiChanged);
    }
  }
});
