define(function (require) {
  require('plugins/kibana/settings/sections/objects/_view');
  require('plugins/kibana/settings/sections/objects/_objects');

  require('angular-ui-ace');
  require('angular-elastic');
  require('ui/directives/confirm_click');

  // add the module deps to this module
  require('modules').get('apps/settings', ['ui.ace', 'monospaced.elastic']);

  return {
    name: 'objects',
    display: 'Objects',
    url: '#/settings/objects'
  };
});
