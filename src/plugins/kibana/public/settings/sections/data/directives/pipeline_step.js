var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/data/directives/pipeline_step.html');

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

