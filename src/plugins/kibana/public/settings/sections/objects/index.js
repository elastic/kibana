import 'plugins/kibana/settings/sections/objects/_view';
import 'plugins/kibana/settings/sections/objects/_objects';
import 'ace';
import 'ui/directives/confirm_click';


// add the module deps to this module
require('ui/modules').get('apps/settings');

export default {
  name: 'objects',
  display: 'Objects',
  url: '#/settings/objects'
};
