define(function (require) {
  const _ = require('lodash');
  const registry = require('ui/registry/settings_sections');

  require('plugins/kibana/settings/sections/objects/_view');
  require('plugins/kibana/settings/sections/objects/_objects');

  require('ace');
  require('ui/directives/confirm_click');

  // add the module deps to this module
  require('ui/modules').get('apps/settings');

  registry.register(_.constant({
    order: 3,
    name: 'objects',
    display: 'Objects',
    url: '#/settings/objects'
  }));
});
