import uiModules from 'ui/modules';
import { map, isObject } from 'lodash';
import '../styles/_pipeline_input.less';
import template from '../views/pipeline_input.html';

const app = uiModules.get('kibana');

app.directive('pipelineInput', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '=',
      samples: '='
    },
    controller: function ($scope) {
      $scope.$watch('pipeline.rawSamples', (newValue) => {
        const splitRawSamples = ('' + newValue).split('\n');

        $scope.samples = map(splitRawSamples, (sample) => {
          try {
            const json = JSON.parse(sample);
            if (isObject(json)) {
              return json;
            } else {
              return defaultObject(sample);
            }
          }
          catch (error) {
            return defaultObject(sample);
          }
        });

        function defaultObject(sample) {
          return { message: sample };
        }
      });
    }
  };
});
