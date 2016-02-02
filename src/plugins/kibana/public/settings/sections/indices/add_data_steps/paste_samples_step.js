var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/add_data_steps/paste_samples_step.html');

modules.get('apps/settings')
  .directive('pasteSamplesStep', function () {
    return {
      template: template,
      scope: {
        samples: '='
      }
    };
  });

