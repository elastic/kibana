import management from 'ui/management';
import 'plugins/kibana/management/sections/objects/_view';
import 'plugins/kibana/management/sections/objects/_objects';
import 'ace';
import 'ui/directives/confirm_click';
import uiModules from 'ui/modules';

// add the module deps to this module
uiModules.get('apps/management');

management.getSection('kibana').register('objects', {
  display: 'Saved Objects',
  order: 10,
  url: '#/management/kibana/objects'
});
