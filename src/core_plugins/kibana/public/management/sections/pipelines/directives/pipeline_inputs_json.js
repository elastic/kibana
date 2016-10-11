import uiModules from 'ui/modules';
import template from '../views/pipeline_inputs_json.html';
import '../styles/pipeline_inputs_json.less';
import _ from 'lodash';
import modes from '../lib/constants/pipeline_modes';
import 'ace';
import angular from 'angular';
import { Sample } from 'ui/pipelines/sample_collection/view_model';

const app = uiModules.get('kibana');

app.directive('pipelineInputsJson', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '=',
      sample: '=',
      mode: '='
    },
    controller: function ($scope) {
      $scope.states = Sample.states;

      $scope.cancelEdit = () => {
        $scope.sample = undefined;
        $scope.mode = modes.INPUTS;
      };

      $scope.saveEdit = () => {
        $scope.pipeline.sampleCollection.replace($scope.sample, $scope.editSample);

        $scope.sample = undefined;
        $scope.mode = modes.INPUTS;
      };

      $scope.aceLoaded = function (editor) {
        editor.$blockScrolling = Infinity;
      };

      $scope.$watch('sample', () => {
        $scope.editSample = angular.copy($scope.sample);
      });
    }
  };
});
