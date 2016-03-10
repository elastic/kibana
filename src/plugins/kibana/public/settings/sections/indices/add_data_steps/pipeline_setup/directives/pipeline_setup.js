import uiModules from 'ui/modules';
import _ from 'lodash';
import Pipeline from '../lib/pipeline';
import Processor from '../lib/processor';
import angular from 'angular';
import processorTypes from '../lib/processor_types';
import savedPipeline from '../sample_pipeline.json'; //temp for debugging purposes

require('../services/ingest');
require('../styles/_pipeline_setup.less');
require('./pipeline_output');
require('./source_data');
require('./processors');

const app = uiModules.get('kibana');

app.directive('pipelineSetup', function () {
  return {
    restrict: 'E',
    template: require('../views/pipeline_setup.html'),
    scope: {
      samples: '=',
      pipeline: '='
    },
    controller: function ($scope, ingest, debounce, Notifier) {
      const notify = new Notifier({ location: `Ingest Pipeline Setup` });
      $scope.processorTypes = _.sortBy(processorTypes, 'title');
      $scope.sample = {};

      const pipeline = new Pipeline(processorTypes, Processor);
      if ($scope.pipeline) {
        pipeline.load($scope.pipeline);
        $scope.sample = $scope.pipeline.input;
      }
      $scope.pipeline = pipeline;

      //initiates the simulate call if the pipeline is dirty
      function simulatePipeline(event, message) {
        if (!pipeline.dirty) return;

        if (pipeline.processors.length === 0) {
          pipeline.updateOutput();
          return;
        }

        ingest.simulatePipeline(pipeline)
        .then((results) => { pipeline.applySimulateResults(results); })
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
