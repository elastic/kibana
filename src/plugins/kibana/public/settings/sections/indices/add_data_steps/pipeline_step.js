var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/add_data_steps/pipeline_step.html');

modules.get('apps/settings')
  .directive('pipelineStep', function () {
    return {
      template: template,
      scope: {
        samples: '=',
        sampleDocs: '=',
        pipeline: '='
      }
    };
  });

