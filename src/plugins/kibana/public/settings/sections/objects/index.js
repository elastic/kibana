define(function (require) {
  require('plugins/kibana/settings/sections/objects/_view');
  require('plugins/kibana/settings/sections/objects/_objects');

  require('ace');
  require('ui/directives/confirm_click');

  // add the module deps to this module
  require('ui/modules').get('apps/settings');

  return {
    name: 'objects',
    display: 'Objects',
    url: '#/settings/objects'
  };
});
