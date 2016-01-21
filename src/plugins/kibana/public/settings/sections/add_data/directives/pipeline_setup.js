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
        if (pipeline.processors.length === 0) {
          pipeline.updateOutput(undefined);
          return;
        }

        ingest.simulatePipeline(pipeline)
        .then(function (results) {
          //update the outputObject of each processor
          results.forEach((result) => {
            const processor = pipeline.getProcessorById(result.processorId);
            const output = _.get(result, 'output');
            const error = _.get(result, 'error');

            processor.outputObject = output;
            processor.setError(error);
          });

          //update the inputObject of each processor
          results.forEach((result) => {
            const processor = pipeline.getProcessorById(result.processorId);

            //this can probably be cleaned up a little.
            if (processor.parent.processorId) {
              processor.inputObject = _.cloneDeep(processor.parent.outputObject);
            } else {
              processor.inputObject = _.cloneDeep(processor.parent);
            }

            processor.updateDescription();
          });
        });
      }
      simulatePipeline = debounce(simulatePipeline, 200);

      function addProcessor(processor) {
        //logger.log('addProcessor');
        const scope = $scope.$new();
        scope.processor = processor;
        scope.pipeline = pipeline;

        const template = `<li><process-container></process-container></li>`;
        const $newEl = $compile(template)(scope);
        $scope.$elements[processor.processorId] = $newEl;
        $newEl.appendTo($el);
      }

      function removeProcessor(processor) {
        const $el = $scope.$elements[processor.processorId];
        $el.slideUp(200, () => {
          $el.remove();
        });
      }

      function updateProcessorChain() {
        pipeline.updateParents();
      }

      function reorderDom() {
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
        var removed = _.difference(oldVal, newVal);
        var added = _.difference(newVal, oldVal);

        removed.forEach(removeProcessor);
        added.forEach(addProcessor);

        updateProcessorChain();
        reorderDom();
        simulatePipeline();
      });

      $scope.$watch('sampleData', function(newVal) {
        pipeline.rootObject = $scope.sampleData;
        updateProcessorChain();
        simulatePipeline();
      });

      function onProcessorUiChanged(event, message) {
        simulatePipeline();
      }

      const processorUiChangedListener = $scope.$on('processor_ui_changed', onProcessorUiChanged);

      $scope.$on('$destroy', () => {
        processorUiChangedListener();
      });
    },
    controller: function ($scope, AppState, ingest) {
      const savedPipeline = require('../sample_pipeline.json');
      const types = require('../lib/processor_type_registry.js').all();
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

      //temp for debugging purposes
      $scope.loadPipeline = function() {
        pipeline.load(savedPipeline);
      }

      //temp for debugging purposes
      $scope.savePipeline = function() {
        const tempPipeline = _.cloneDeep(pipeline);
        tempPipeline.processors.forEach((processor) => {
          delete processor.inputObject;
          delete processor.outputObject;
          delete processor.parent;
        });
        delete tempPipeline.rootObject;
        delete tempPipeline.output;

        console.log(angular.toJson(tempPipeline, true));
      }
    }
  };
});
