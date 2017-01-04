import uiModules from 'ui/modules';
import { map, isObject } from 'lodash';
import '../styles/_pipeline_input.less';
import template from '../views/pipeline_input.html';
import modes from '../lib/constants/pipeline_modes';
import _ from 'lodash';

const app = uiModules.get('kibana');

app.directive('pipelineInput', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '=',
      mode: '='
    },
    controller: function ($scope) {
      const pipeline = $scope.pipeline;
      const sampleCollection = $scope.sampleCollection = pipeline.sampleCollection;

      $scope.editSamples = () => {
        $scope.mode = modes.INPUTS;
      };

      $scope.previousSample = () => {
        let newIndex = sampleCollection.index - 1;
        if (newIndex === -1) newIndex = sampleCollection.samples.length - 1;

        sampleCollection.index = newIndex;
      };

      $scope.nextSample = () => {
        let newIndex = sampleCollection.index + 1;
        if (newIndex === sampleCollection.samples.length) newIndex = 0;

        sampleCollection.index = newIndex;
      };

      $scope.$watch('sampleCollection.getCurrentSample()', (newVal) => {
        $scope.currentSample = newVal;
        pipeline.input = _.get($scope.currentSample, 'doc');
      });
    }
  };
});
