import uiModules from 'ui/modules';
import _ from 'lodash';
import Pipeline from '../lib/pipeline';
import angular from 'angular';
import IngestProvider from 'ui/ingest';
import '../styles/_pipeline_setup.less';
import './pipeline_output';
import './source_data';
import './processor_ui_container';
import './processor_select';
import './ignore_failure_select';
import './set_focus';
import '../processors';
import template from '../views/pipeline_setup.html';

const app = uiModules.get('kibana');

app.directive('pipelineSetup', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      samples: '=',
      pipeline: '='
    },
    controller: function ($scope, debounce, Private, Notifier) {
      const ingest = Private(IngestProvider);
      const notify = new Notifier({ location: `Ingest Pipeline Setup` });
      $scope.sample = {};

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

      $scope.$watch('processorType', processorType => {
        if (!processorType) return;
        pipeline.add(processorType);
        $scope.processorType = null;
      });

      $scope.$watch('pipeline.dirty', simulatePipeline);

      $scope.expandContext = 1;
    }
  };
});
