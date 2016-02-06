import 'plugins/kibana/settings/sections/objects/_view';
import 'plugins/kibana/settings/sections/objects/_objects';
import 'ace';
import 'ui/directives/confirm_click';
import uiModules from 'ui/modules';


// add the module deps to this module
uiModules.get('apps/settings');

export default {
  name: 'objects',
  display: 'Objects',
  url: '#/settings/objects'
};
