const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'join',
  title: 'Join',
  template: '<processor-ui-join></processor-ui-join>',
  sourceField: '',
  separator: '',
  getDefinition: function() {
    const self = this;
    return {
      'join' : {
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
app.directive('processorUiJoin', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_join.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;

      function consumeNewInputObject() {
        const allKeys = keysDeep(processor.inputObject);
        const keys = [];
        allKeys.forEach((key) => {
          if (_.isArray(_.get(processor.inputObject, key))) {
            keys.push(key);
          }
        })
        $scope.fields = keys;
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

      $scope.$watch('processor.separator', processorUiChanged);
    }
  }
});
