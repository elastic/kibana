import uiModules from 'ui/modules';
import _ from 'lodash';
import Pipeline from '../lib/pipeline';
import angular from 'angular';
import * as ProcessorTypes from '../lib/processor_types';
import IngestProvider from 'ui/ingest';
import '../styles/_pipeline_setup.less';
import './pipeline_output';
import './source_data';
import './processors';

const app = uiModules.get('kibana');

function buildProcessorTypeList() {
  const result = [];
  _.forIn(ProcessorTypes, function (Type, key) {
    const instance = new Type('');
    if (instance.data.typeId !== 'base') {
      result.push({
        typeId: instance.data.typeId,
        title: instance.title,
        Type: Type
      });
    }
  });

  return result;
}

app.directive('pipelineSetup', function () {
  return {
    restrict: 'E',
    template: require('../views/pipeline_setup.html'),
    scope: {
      samples: '=',
      pipeline: '='
    },
    controller: function ($scope, debounce, Private, Notifier) {
      const ingest = Private(IngestProvider);
      const notify = new Notifier({ location: `Ingest Pipeline Setup` });
      $scope.processorTypes = _.sortBy(buildProcessorTypeList(), 'title');
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
      const simulatePipeline = debounce(function (event, message) {
        if (!pipeline.dirty) return;

        if (pipeline.processors.length === 0) {
          pipeline.updateOutput();
          return;
        }

        ingest.simulate(pipeline)
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

      $scope.$watch('pipeline.dirty', simulatePipeline);
    }
  };
});
