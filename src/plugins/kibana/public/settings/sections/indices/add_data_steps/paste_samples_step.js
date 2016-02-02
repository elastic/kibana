const modules = require('ui/modules');
const template = require('plugins/kibana/settings/sections/indices/add_data_steps/paste_samples_step.html');
const _ = require('lodash');

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

