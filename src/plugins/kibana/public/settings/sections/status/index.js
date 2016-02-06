import _ from 'lodash';
import registry from 'ui/registry/settings_sections';

registry.register(_.constant({
  order: 1000,
  name: 'status',
  display: 'Status',
  url: '/status'
}));
