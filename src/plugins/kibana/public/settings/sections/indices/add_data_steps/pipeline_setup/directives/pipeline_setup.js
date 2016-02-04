const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const Pipeline = require('../lib/pipeline');
const angular = require('angular');

require('../services/ingest');
require('../styles/_pipeline_setup.less');
require('./pipeline_output');
require('./source_data');
require('./processors');

app.directive('pipelineSetup', function (ingest, debounce, Notifier) {
  return {
    restrict: 'E',
    template: require('../views/pipeline_setup.html'),
    scope: {
      samples: '=',
      pipeline: '='
    },
    link: function ($scope, $el) {
      const notify = new Notifier({
        location: `Ingest Pipeline Setup`
      });
      const $container = $el;
      $el = $container.find('.pipeline-container');

      const pipeline = $scope.pipeline;

      function updateProcessors(results) {
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
      }

      function simulatePipeline(event, message) {
        if (!pipeline.dirty) return;

        if (pipeline.processors.length === 0) {
          pipeline.updateOutput();
          return;
        }

        ingest.simulatePipeline(pipeline)
        .then(updateProcessors)
        .catch(notify.error);
      }
      simulatePipeline = debounce(simulatePipeline, 200);

      $scope.$watchCollection('pipeline.processors', (newVal, oldVal) => {
        pipeline.updateParents();
        pipeline.dirty = true;
        simulatePipeline();
      });

      $scope.$watch('sample', (newVal) => {
        pipeline.input = $scope.sample;
        pipeline.updateParents();
        pipeline.dirty = true;
        simulatePipeline();
      });

      $scope.$watch('pipeline.dirty', simulatePipeline);
    },
    controller: function ($scope) {
      const savedPipeline = require('../sample_pipeline.json');
      const types = require('../../../../../../../common/ingest_processor_types');
      $scope.processorTypes = _.sortBy(types, 'title');
      $scope.sample = {};

      const pipeline = new Pipeline();
      if ($scope.pipeline) {
        pipeline.load($scope.pipeline);
        $scope.sample = $scope.pipeline.input;
      }
      $scope.pipeline = pipeline;

      //temp for debugging purposes
      $scope.loadPipeline = function () {
        pipeline.load(savedPipeline);
      };

      //temp for debugging purposes
      $scope.savePipeline = function () {
        const tempPipeline = _.cloneDeep(pipeline);
        tempPipeline.processors.forEach((processor) => {
          delete processor.inputObject;
          delete processor.outputObject;
          delete processor.parent;
        });
        delete tempPipeline.input;
        delete tempPipeline.output;

        //console.log(angular.toJson(tempPipeline, true));
      };
    }
  };
});
