const modules = require('ui/modules');
const template = require('plugins/kibana/settings/sections/indices/directives/paste_samples_step.html');
const _ = require('lodash');


modules.get('apps/settings')
  .directive('pasteSamplesStep', function () {
    return {
      template: template,
      scope: {
        samples: '='
      },
      controller: function ($scope) {
        $scope.userSamples = '';
        $scope.$watch('userSamples', function (newValue) {
          const splitUserSamples = newValue.split('\n');

          try {
            $scope.samples = _.map(splitUserSamples, function (sample) {
              return JSON.parse(sample);
            });
          }
          catch (error) {
            $scope.samples = _.map(splitUserSamples, function (sample) {
              return {message: sample};
            });
          }
        });
      }
    };
  });

