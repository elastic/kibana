import management from 'ui/management';
import routes from 'ui/routes';
import template from 'plugins/kibana/management/sections/indices/upload/index.html';
import './directives/upload_wizard';

routes.when('/management/data/upload/', {
  template: template
});

management.getSection('data').register('upload', {
  display: 'Upload CSV',
  order: 10,
  path: 'data/upload/'
});

