import routes from 'ui/routes';
import template from 'plugins/kibana/settings/sections/indices/upload/index.html';
import './directives/upload_wizard';

routes.when('/settings/indices/create/upload', {
  template: template
});
