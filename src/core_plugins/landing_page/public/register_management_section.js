import { management } from 'ui/management';

management.getSection('kibana').register('landing_page', {
  display: 'Landing Page',
  order: 50,
  url: '#/management/kibana/landing_page'
});
