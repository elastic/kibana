var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/add_data_steps/paste_samples_step.html');

modules.get('apps/settings')
  .directive('pasteSamplesStep', function () {
    return {
      template: template,
      scope: {
        samples: '='
      },
      controller: function ($scope) {
        const lines = require('./paste_samples_step_data.txt').split('\n');

        $scope.updateData = function () {
          $scope.samples = lines.map((line) => {
            return {
              '_raw': line
            };
          });
        };

      }
    };
  });
