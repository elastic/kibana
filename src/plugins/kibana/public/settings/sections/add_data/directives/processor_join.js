const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'join',
  title: 'Join',
  template: '<processor-join></processor-join>',
  getDefinition: function() {
    const self = this;
    return {
      'join' : {
        'field' : self.sourceField,
        'separator' : self.separator
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    return `Join - [${source}]`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorJoin', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_join.html'),
    controller : function ($scope, $rootScope, debounce, ingest) {
      const processor = $scope.processor;

      function getDescription() {
        const source = (processor.sourceField) ? processor.sourceField : '?';
        return `Join - [${source}]`;
      }

      function checkForNewInputObject() {
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

      function applyProcessor() {
        checkForNewInputObject();

        $rootScope.$broadcast('processor_started', { processor: processor });

        let output;
        const description = processor.getDescription();

        ingest.simulate(processor)
        .then(function (result) {
          //TODO: this flow needs to be streamlined
          if (!result) {
            output = _.cloneDeep(processor.inputObject);
          } else {
            output = result;
          }

          const message = {
            processor: processor,
            output: output,
            description: description
          };

          $rootScope.$broadcast('processor_finished', message);
        });
      }
      applyProcessor = debounce(applyProcessor, 200);

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      const startListener = $scope.$on('processor_start', processorStart);

      $scope.$on('$destroy', () => {
        startListener();
      });

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        applyProcessor();
      });

      $scope.$watch('processor.separator', applyProcessor);
    }
  }
});

