import modules from 'ui/modules';
import template from './paste_samples_step.html';
import { filebeat as docLinks } from '../../../../../../../../ui/public/documentation_links/documentation_links';
import _ from 'lodash';
import './styles/_add_data_paste_samples_step.less';

modules.get('apps/management')
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
        this.docLinks = docLinks;

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

