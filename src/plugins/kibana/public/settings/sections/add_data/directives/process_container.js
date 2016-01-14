const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
require('./process_container_header');

app.directive('processContainer', function ($compile) {
  return {
    restrict: 'E',
    template: require('../views/process_container.html'),
    link: function ($scope, $el) {
      const processor = $scope.processor;
      const $container = $el.find('.process-worker-container');

      const scope = $scope.$new();
      scope.processor = processor;
      const $innerEl = $compile(processor.template)(scope);

      $innerEl.appendTo($container);
    },
    controller: function ($scope, $rootScope) {
      const processor = $scope.processor;

      const Logger = require('../lib/logger');
      const logger = new Logger(`process_container(${processor.processorId})`, true);

      function updateInputObject() {
        //checks to see if the parent is a basic object or a processor
        if (processor.parent.processorId) {
          processor.inputObject = _.cloneDeep(processor.parent.outputObject);
        } else {
          processor.inputObject = _.cloneDeep(processor.parent);
        }
        logger.log('updateInputObject', processor.inputObject);
        //this is where we would raise the processor_input_object_changing event, but I'm trying to see if
        //a normal watcher in the processor_ui would work.
      }

      function onPipelineSimulated(event, message) {
        if (message.processor != processor) return;
        logger.log('on(pipeline_simulated)', message);

        const output = _.get(message.result, 'output');
        const error = _.get(message.result, 'error');

        processor.outputObject = output;
        processor.setError(error);
        processor.updateDescription();

        //TODO: updating the input objects may need to happen after all the outputobjects have been set.
        //updateInputObject();

        logger.log('broadcast(processor_simulation_consumed)');
        $rootScope.$broadcast('processor_simulation_consumed', { processor: processor });
      }

      function onProcessorUpdateInput(event, message) {
        if (message.processor != processor) return;
        logger.log('on(processor_update_input)', message);

        updateInputObject();
      }

      const pipelineSimulatedListener = $scope.$on('pipeline_simulated', onPipelineSimulated);
      const processorUpdateInputListener = $scope.$on('processor_update_input', onProcessorUpdateInput);

      $scope.$on('$destroy', () => {
        pipelineSimulatedListener();
        processorUpdateInputListener();
      });

      //This may be replaced with a normal watcher in the processor_ui...
      //const inputObjectChangedListener = $scope.$on('processor_input_object_changed', applyProcessor);

      // $scope.$on('$destroy', () => {
      //   forceUpdateListener();
      //   updateListener();
      //   inputObjectChangedListener();
      // });
    }
  };
});
