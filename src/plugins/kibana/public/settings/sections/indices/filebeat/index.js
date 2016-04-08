import routes from 'ui/routes';
import template from 'plugins/kibana/settings/sections/indices/filebeat/index.html';
import 'plugins/kibana/settings/sections/indices/filebeat/directives/filebeat_wizard';


routes.when('/settings/indices/create/filebeat', {
  template: template
});
