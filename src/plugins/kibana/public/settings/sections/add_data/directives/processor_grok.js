const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
require('../services/ingest');

require('../lib/processor_registry').register({
  typeid: 'grok',
  title: 'Grok',
  template: '<processor-grok></processor-grok>',
  getDefinition: function() {
    const self = this;
    return {
      'grok' : {
        'field' : self.sourceField,
        'pattern': self.pattern
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    return `Grok - [${source}]`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorGrok', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_grok.html'),
    controller : function ($scope, $rootScope, debounce, ingest) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, 'processorGeoIp', false);

      function getDescription() {
        const source = (processor.sourceField) ? processor.sourceField : '?';
        return `Grok - [${source}]`;
      }

      function checkForNewInputObject() {
        logger.log('consuming new inputObject', processor.inputObject);
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
      }

      function applyProcessor() {
        checkForNewInputObject();

        logger.log('I am processing!');
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

          logger.log('I am DONE processing!');
          $rootScope.$broadcast('processor_finished', message);
        });
      }
      applyProcessor = debounce(applyProcessor, 200);

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      const startListener = $scope.$on('processor_start', processorStart);

      $scope.$on('$destroy', () => {
        startListener();
      });

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        applyProcessor();
      });

      //processor.pattern = '%{DATE:timestamp} - - %{GREEDYDATA:text}';
      processor.pattern = '';
      $scope.$watch('processor.pattern', applyProcessor);

      //%{DATE:timestamp} - - src=%{IP:grok_ip}: %{GREEDYDATA:text}
    }
  }
});

