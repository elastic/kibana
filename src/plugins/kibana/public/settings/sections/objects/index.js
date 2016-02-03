import 'plugins/kibana/settings/sections/objects/_view';
import 'plugins/kibana/settings/sections/objects/_objects';
import 'ace';
import 'ui/directives/confirm_click';
define(function (require) {


  // add the module deps to this module
  require('ui/modules').get('apps/settings');

  return {
    name: 'objects',
    display: 'Objects',
    url: function () {
      const hash = window.location.hash;
      return hash.indexOf('/objects') === -1 ? '#/settings/objects?' + hash.split('?')[1] : '#/settings/objects';
    }
  };
});
