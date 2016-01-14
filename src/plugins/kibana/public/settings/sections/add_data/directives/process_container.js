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

      //TODO: Clean this up!!!!
      function onPipelineSimulated(event, message) {
        if (message.processor != processor) return;
        logger.log('on(pipeline_simulated)', message);

        const output = _.get(message.result, 'output');
        const error = _.get(message.result, 'error');

        //This is questionable... since the inputObject won't get updated until later, so this input object is stale.
        //attempting to move updateInputObject above.
        //
        //This also may not be what we want to display... since it's showing output from an invalid pipeline... where
        //in production this would not be the case.
        //if (output) {
          processor.outputObject = output;
        //} else {
        //  processor.outputObject = _.cloneDeep(processor.inputObject);
        //}
        processor.setError(error);
        processor.updateDescription();

        updateInputObject();

        logger.log('broadcast(simulation_results_consumed_by_processor)');
        $rootScope.$broadcast('simulation_results_consumed_by_processor', { processor: processor });
      }

      const pipelineSimulatedListener = $scope.$on('pipeline_simulated', onPipelineSimulated);

      $scope.$on('$destroy', () => {
        pipelineSimulatedListener();
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
