import routes from 'ui/routes';
import template from 'plugins/kibana/management/sections/indices/filebeat/index.html';
import 'plugins/kibana/management/sections/indices/filebeat/directives/filebeat_wizard';


routes.when('/management/data/filebeat', {
  template: template
});
