import uiModules from 'ui/modules';
import _ from 'lodash';
import Pipeline from '../lib/pipeline';
import angular from 'angular';
import * as ProcessorTypes from '../processors/view_models';
import IngestProvider from 'ui/ingest';
import '../styles/_pipeline_setup.less';
import './pipeline_output';
import './source_data';
import './processor_ui_container';
import '../processors';
import pipelineSetupTemplate from '../views/pipeline_setup.html';

const app = uiModules.get('kibana');

function buildProcessorTypeList(enabledProcessorTypeIds) {
  return _(ProcessorTypes)
    .map(Type => {
      const instance = new Type();
      return {
        typeId: instance.typeId,
        title: instance.title,
        Type
      };
    })
    .compact()
    .filter((processorType) => enabledProcessorTypeIds.includes(processorType.typeId))
    .sortBy('title')
    .value();
}

app.directive('pipelineSetup', function () {
  return {
    restrict: 'E',
    template: pipelineSetupTemplate,
    scope: {
      samples: '=',
      pipeline: '='
    },
    controller: function ($scope, debounce, Private, Notifier) {
      const ingest = Private(IngestProvider);
      const notify = new Notifier({ location: `Ingest Pipeline Setup` });
      $scope.sample = {};

      //determines which processors are available on the cluster
      ingest.getProcessors()
      .then((enabledProcessorTypeIds) => {
        $scope.processorTypes = buildProcessorTypeList(enabledProcessorTypeIds);
      })
      .catch(notify.error);

      const pipeline = new Pipeline();
      // Loads pre-existing pipeline which will exist if the user returns from
      // a later step in the wizard
      if ($scope.pipeline) {
        pipeline.load($scope.pipeline);
        $scope.sample = $scope.pipeline.input;
      }
      $scope.pipeline = pipeline;

      //initiates the simulate call if the pipeline is dirty
      const simulatePipeline = debounce((event, message) => {
        if (pipeline.processors.length === 0) {
          pipeline.updateOutput();
          return;
        }

        return ingest.simulate(pipeline.model)
        .then((results) => { pipeline.applySimulateResults(results); })
        .catch(notify.error);
      }, 200);

      $scope.$watchCollection('pipeline.processors', (newVal, oldVal) => {
        pipeline.updateParents();
      });

      $scope.$watch('sample', (newVal) => {
        pipeline.input = $scope.sample;
        pipeline.updateParents();
      });

      $scope.$watch('processorType', (newVal) => {
        if (!newVal) return;

        pipeline.add(newVal.Type);
        $scope.processorType = '';
      });

      $scope.$watch('pipeline.dirty', simulatePipeline);

      $scope.expandContext = 1;
    }
  };
});
