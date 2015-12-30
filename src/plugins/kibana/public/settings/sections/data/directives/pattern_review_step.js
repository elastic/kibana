var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/data/directives/pattern_review_step.html');

modules.get('apps/settings')
  .directive('patternReviewStep', function () {
    return {
      template: template,
      scope: {
        docs: '=',
        save: '&onSave'
      }
    };
  });

