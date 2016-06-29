import management from 'ui/management';
import routes from 'ui/routes';
import template from 'plugins/kibana/management/sections/indices/upload/index.html';
import './directives/upload_wizard';

routes.when('/management/data/csv/', {
  template: template
});

management.getSection('data').register('csv', {
  display: 'Upload CSV',
  order: 10,
  url: '#/management/data/csv/'
});
