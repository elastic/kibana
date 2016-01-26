var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/directives/pattern_review_step.html');

modules.get('apps/settings')
  .directive('patternReviewStep', function () {
    return {
      template: template,
      scope: {
        sampleDocs: '=',
        indexPattern: '=',
        pipeline: '='
      }
    };
  });

