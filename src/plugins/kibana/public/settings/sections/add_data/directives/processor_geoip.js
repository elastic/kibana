const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
require('../services/ingest');

require('../lib/processor_registry').register({
  typeid: 'geoip',
  title: 'Geo IP',
  template: '<processor-geoip></processor-geoip>'
});

//scope.processor is attached by the process_container.
app.directive('processorGeoip', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_geoip.html'),
    controller : function ($scope, $rootScope, debounce, ingest) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, 'processorGeoIp', false);

      function getDescription() {
        const source = (processor.sourceField) ? processor.sourceField : '?';
        const target = (processor.targetField) ? processor.targetField : '?';
        return `Geo IP - [${source}] -> [${target}]`;
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
        const description = getDescription();

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

      $scope.$watch('processor.targetField', applyProcessor);

      processor.targetField = 'geoip';
    }
  }
});

