import modules from 'ui/modules';
import template from './paste_samples_step.html';
import _ from 'lodash';
import './styles/_add_data_paste_samples_step.less';

modules.get('apps/settings')
  .directive('pasteSamplesStep', function () {
    return {
      template: template,
      scope: {
        samples: '=',
        rawSamples: '='
      },
      bindToController: true,
      controllerAs: 'pasteStep',
      controller: function ($scope) {
        if (_.isUndefined(this.rawSamples)) {
          this.rawSamples = '';
        }

        $scope.$watch('pasteStep.rawSamples', (newValue) => {
          const splitRawSamples = newValue.split('\n');

          try {
            this.samples = _.map(splitRawSamples, (sample) => {
              return JSON.parse(sample);
            });
          }
          catch (error) {
            this.samples = _.map(splitRawSamples, (sample) => {
              return {message: sample};
            });
          }
        });
      }
    };
  });

