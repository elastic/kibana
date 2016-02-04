var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/add_data_steps/pattern_review_step.html');

modules.get('apps/settings')
  .directive('patternReviewStep', function () {
    return {
      template: template,
      scope: {
        indexPattern: '=',
        pipeline: '='
      }
    };
  });

