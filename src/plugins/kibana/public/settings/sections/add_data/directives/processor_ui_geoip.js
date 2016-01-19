const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
require('../services/ingest');

require('../lib/processor_registry').register({
  typeid: 'geoip',
  title: 'Geo IP',
  template: '<processor-ui-geoip></processor-ui-geoip>',
  getDefinition: function() {
    const self = this;
    return {
      'geoip' : {
        'processor_id': self.processorId,
        'source_field' : self.sourceField ? self.sourceField : '',
        'target_field': self.targetField ? self.targetField : ''
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    const target = (self.targetField) ? self.targetField : '?';
    return `[${source}] -> [${target}]`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorUiGeoip', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_geoip.html'),
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
      processor.targetField = 'geoip';

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.targetField', processorUiChanged);
    }
  }
});
