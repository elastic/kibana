import { management } from 'ui/management';
import { GETTING_STARTED_ROUTE } from './constants';

management.getSection('kibana').register('getting_started', {
  display: 'Getting Started',
  order: 50,
  url: `#${GETTING_STARTED_ROUTE}`
});
