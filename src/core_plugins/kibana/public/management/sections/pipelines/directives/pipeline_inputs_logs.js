import uiModules from 'ui/modules';
import template from '../views/pipeline_inputs_logs.html';
import '../styles/pipeline_inputs_logs.less';
import modes from '../lib/constants/pipeline_modes';
import _ from 'lodash';
import { Sample } from 'ui/pipelines/sample_collection/view_model';

const app = uiModules.get('kibana');

app.directive('pipelineInputsLogs', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '=',
      mode: '='
    },
    controller: function ($scope) {
      const sampleCollection = $scope.pipeline.sampleCollection;

      $scope.targetProperty = 'message';

      $scope.cancelEdit = () => {
        $scope.mode = modes.INPUTS;
      };

      $scope.saveEdit = () => {
        _.forEach($scope.samples, (sample) => {
          sampleCollection.add({ doc: sample });
        });

        $scope.mode = modes.INPUTS;
      };

      function defaultObject(line) {
        const doc = {};
        _.set(doc, $scope.targetProperty, line);

        return new Sample(doc);
      }

      function updateSamples() {
        const logLines = ('' + $scope.logLines).split('\n');

        $scope.samples = _.map(logLines, (line) => {
          try {
            const json = JSON.parse(line);
            if (_.isObject(json)) {
              return json;
            } else {
              return defaultObject(line);
            }
          }
          catch (error) {
            return defaultObject(line);
          }
        });
      }

      $scope.$watch('logLines', () => { updateSamples(); });
      $scope.$watch('targetProperty', () => { updateSamples(); });
      $scope.$watch('mode', () => {
        $scope.samples = undefined;
        $scope.logLines = undefined;
      });
    }
  };
});
