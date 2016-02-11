import _ from 'lodash';
import registry from 'ui/registry/settings_sections';
import 'plugins/kibana/settings/sections/objects/_view';
import 'plugins/kibana/settings/sections/objects/_objects';
import 'ace';
import 'ui/directives/confirm_click';
import uiModules from 'ui/modules';


// add the module deps to this module
uiModules.get('apps/settings');

registry.register(_.constant({
  order: 3,
  name: 'objects',
  display: 'Objects',
  url: '#/settings/objects'
}));
