const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const Pipeline = require('../lib/pipeline');

require('./processors');

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
        if (!pipeline.dirty) return;

        if (pipeline.processors.length === 0) {
          pipeline.updateOutput();
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
            processor.error = error;
          });

          //update the inputObject of each processor
          results.forEach((result) => {
            const processor = pipeline.getProcessorById(result.processorId);

            //we don't want to change the inputObject if the processor is in error
            //because that can cause us to lose state.
            if (!_.get(processor, 'error.isNested')) {
              //this can probably be cleaned up a little.
              if (processor.parent.processorId) {
                processor.inputObject = _.cloneDeep(processor.parent.outputObject);
              } else {
                processor.inputObject = _.cloneDeep(processor.parent);
              }
            }

            processor.updateDescription();
          });

          pipeline.updateOutput();
          pipeline.dirty = false;
        });
      }
      simulatePipeline = debounce(simulatePipeline, 200);

      $scope.$watchCollection('pipeline.processors', function (newVal, oldVal) {
        pipeline.updateParents();
        pipeline.dirty = true;
        simulatePipeline();
      });

      $scope.$watch('sampleData', function(newVal) {
        pipeline.rootObject = $scope.sampleData;
        pipeline.updateParents();
        pipeline.dirty = true;
        simulatePipeline();
      });

      $scope.$watch('pipeline.dirty', simulatePipeline);
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
