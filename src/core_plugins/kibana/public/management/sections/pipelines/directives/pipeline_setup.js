import uiModules from 'ui/modules';
import Pipeline from 'ui/pipelines/pipeline/view_model';
import angular from 'angular';
import PipelinesProvider from 'ui/pipelines';
import '../styles/_pipeline_setup.less';
import '../../indices/styles/_add_data_wizard.less'; //TODO: Need to find a better home for this stuff.
import template from '../views/pipeline_setup.html';
import processorRegistry from 'ui/registry/pipelines_processors';
import ProcessorCollection from 'ui/pipelines/processor_collection/view_model';
import './pipeline_inputs';
import modes from '../lib/constants/pipeline_modes';

const app = uiModules.get('kibana');

app.directive('pipelineSetup', function () {
  return {
    restrict: 'E',
    template: template,
    controller: function ($scope, $route, debounce, Private, Notifier) {
      const pipelines = Private(PipelinesProvider);
      const notify = new Notifier({ location: `Pipeline Setup` });
      $scope.collectionTypes = ProcessorCollection.types;
      $scope.modes = modes;

      if ($scope.pipeline.sampleCollection.samples.length > 0) {
        $scope.mode = $scope.modes.PIPELINE;
      } else {
        $scope.mode = $scope.modes.INPUTS;
      }

      $scope.pipeline = $route.current.locals.pipeline;

      //initiates the simulate call if the pipeline is dirty
      const simulatePipeline = debounce((event, message) => {
        const pipeline = $scope.pipeline;

        if (pipeline.processorCollection.processors.length === 0) {
          pipeline.updateOutput();
          return;
        }
        if (pipeline.sampleCollection.samples.length === 0) {
          pipeline.updateOutput();
          return;
        }

        return pipelines.pipeline.simulate(pipeline.model, pipeline.input)
        .then((results) => { pipeline.applySimulateResults(results); })
        .catch(notify.error);
      }, 200);

      $scope.$watchCollection('pipeline.sampleCollection.samples', () => {
        const pipeline = $scope.pipeline;
        pipeline.dirty = true;
      });

      $scope.$watchCollection('pipeline.activeProcessorCollection.processors', (newVal, oldVal) => {
        const pipeline = $scope.pipeline;
        pipeline.dirty = true;
      });

      $scope.$watch('pipeline.input', (newVal) => {
        const pipeline = $scope.pipeline;
        pipeline.dirty = true;
      });

      $scope.$watch('processorTypeId', processorTypeId => {
        if (!processorTypeId) return;

        const pipeline = $scope.pipeline;

        pipeline.activeProcessorCollection.add(processorTypeId);
        $scope.processorTypeId = null;
      });

      $scope.$watch('pipeline.dirty', simulatePipeline);

      $scope.$watch('pipeline', (newPipeline) => {
        const pipeline = $scope.pipeline;
        pipeline.dirty = true;

        window.pipeline = $scope.pipeline;
        window.ProcessorCollection = ProcessorCollection;
      });

      $scope.expandContext = 1;
    }
  };
});
