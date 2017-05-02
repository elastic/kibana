import { management } from 'ui/management';

management.getSection('kibana').register('getting_started', {
  display: 'Landing Page',
  order: 50,
  url: '#/management/kibana/getting_started'
});
