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
      controller: function ($scope) {
        if (_.isUndefined($scope.rawSamples)) {
          $scope.rawSamples = '';
        }

        $scope.$watch('rawSamples', function (newValue) {
          const splitRawSamples = newValue.split('\n');

          try {
            $scope.samples = _.map(splitRawSamples, function (sample) {
              return JSON.parse(sample);
            });
          }
          catch (error) {
            $scope.samples = _.map(splitRawSamples, function (sample) {
              return {message: sample};
            });
          }
        });
      }
    };
  });

