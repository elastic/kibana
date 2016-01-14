const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const Pipeline = require('../lib/pipeline');

require('./processors');
require('./list_of_values');

const Logger = require('../lib/logger');
const logger = new Logger('pipeline_setup', true);

app.directive('pipelineSetup', function ($compile, $rootScope, ingest, debounce) {
  return {
    restrict: 'E',
    template: require('../views/pipeline_setup.html'),
    link: function ($scope, $el) {
      const $container = $el;
      $el = $scope.$el = $container.find('.pipeline-container');

      const pipeline = $scope.pipeline;

      const nameThisWell = [];
      function simulatePipeline(event, message) {
        logger.log('simulatePipeline', pipeline);
        if (pipeline.processors.length === 0) {
          logger.log('simulatePipeline - zero-length pipeline', pipeline);
          return;
        }

        ingest.simulatePipeline(pipeline)
        .then(function (result) {
          logger.log('simulatePipeline result', result);

          //TODO: It is important that these resolve in order. Can not simply send the messages
          //into the void and assume they will resolve in the correct order.
          //
          //OR: We could update the output and the input in two steps... first step, update all of the
          //outputs... second step, update all of the inputs. Then we just need to know that they all happened,
          //not that they happened in the right order.
          //However, once that has been proven to work, we need to uniquely identify a particular simulation so
          //we only listen to events from the latest one and ignore stale events

          result.forEach((processorResult) => {
            const processor = pipeline.getProcessorById(processorResult.processorId);
            nameThisWell.push(processor);
            logger.log('broadcast(pipeline_simulated)');
            $rootScope.$broadcast('pipeline_simulated', { processor: processor, result: processorResult });
          });
        });
      }
      simulatePipeline = debounce(simulatePipeline, 200);

      function addProcessor(processor) {
        logger.log('addProcessor');
        const scope = $scope.$new();
        scope.processor = processor;
        scope.pipeline = pipeline;

        const template = `<li><process-container></process-container></li>`;
        const $newEl = $compile(template)(scope);
        $scope.$elements[processor.processorId] = $newEl;
        $newEl.appendTo($el);
      }

      function removeProcessor(processor) {
        logger.log('removeProcessor');
        const $el = $scope.$elements[processor.processorId];
        $el.slideUp(200, () => {
          $el.remove();
        });
      }

      function updateProcessorChain() {
        logger.log('updateProcessorChain');
        pipeline.updateParents();
      }

      function reorderDom() {
        logger.log('reorderDom');
        const processors = pipeline.processors;
        const $parent = $scope.$el;

        processors.forEach((processor, index) => {
          const $el = $scope.$elements[processor.processorId];

          if (index === 0) {
            if (!$el.is(':first-child')) {
              $el.detach();
              $parent.prepend($el);
            }
          } else {
            const previousProcessor = processors[index-1];
            const $previousEl = $scope.$elements[previousProcessor.processorId];
            if ($el.prev()[0] !== $previousEl[0]) {
              $el.detach();
              $previousEl.after($el);
            }
          }
        });
      }

      $scope.$watchCollection('pipeline.processors', function (newVal, oldVal) {
        logger.log('$watch pipeline.processors');
        var removed = _.difference(oldVal, newVal);
        var added = _.difference(newVal, oldVal);

        removed.forEach(removeProcessor);
        added.forEach(addProcessor);

        updateProcessorChain();
        reorderDom();
        simulatePipeline();
      });

      $scope.$watch('sampleData', function(newVal) {
        logger.log('$watch sampleData');
        pipeline.rootObject = $scope.sampleData;
        updateProcessorChain();
        simulatePipeline();
      });

      function onProcessorSimulationConsumed(event, message) {
        logger.log('on(processor_simulation_consumed)', message);

        //remove processor from nameThisWell. If nameThisWell is empty, update the inputs.
        _.remove(nameThisWell, message.processor);
        if (nameThisWell.length === 0) {
          logger.log('onProcessorSimulationConsumed - all processors reported in. Update inputObjects.');

          pipeline.updateOutput();

          pipeline.processors.forEach((processor) => {
            logger.log('broadcast(processor_update_input)');
            $rootScope.$broadcast('processor_update_input', { processor: processor });
          });
        }
      }

      function onProcessorUiChanged(event, message) {
        logger.log('on(processor_ui_changed)', message);
        simulatePipeline();
      }

      const processorSimulationConsumedListener =
        $scope.$on('processor_simulation_consumed', onProcessorSimulationConsumed);
      const processorUiChangedListener = $scope.$on('processor_ui_changed', onProcessorUiChanged);

      $scope.$on('$destroy', () => {
        processorSimulationConsumedListener();
        processorUiChangedListener();
      });
    },
    controller: function ($scope, AppState, ingest) {
      const types = require('../lib/processor_registry.js').all();
      const pipeline = new Pipeline();
      $scope.processorTypes = _.sortBy(types, 'title');
      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.$elements = {}; //keeps track of the dom elements associated with processors as jquery objects
      $scope.sampleData = {};
      $scope.pipeline = pipeline;

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }
    }
  };
});
