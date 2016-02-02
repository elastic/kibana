var routes = require('ui/routes');
var template = require('plugins/kibana/settings/sections/indices/filebeat/index.html');

require('plugins/kibana/settings/sections/indices/filebeat/directives/filebeat_wizard');

routes.when('/settings/indices/create/filebeat', {
  template: template
});
