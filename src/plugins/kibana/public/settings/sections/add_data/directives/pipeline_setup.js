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
          result.forEach((processorResult) => {
            const processor = pipeline.getProcessorById(processorResult.processorId);
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
    },
    controller: function ($scope, AppState, ingest) {
      const types = require('../lib/processor_registry.js').all();
      $scope.processorTypes = _.sortBy(types, 'title');
      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.pipeline = new Pipeline();
      $scope.$elements = {}; //keeps track of the dom elements associated with processors as jquery objects
      $scope.sampleData = {};

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }
    }
  };
});
