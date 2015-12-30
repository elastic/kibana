var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/data/directives/install_filebeat_step.html');

modules.get('apps/settings')
  .directive('installFilebeatStep', function () {
    return {
      template: template
    };
  });

