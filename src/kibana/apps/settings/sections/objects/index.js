define(function (require) {
  require('./_view');
  require('./_objects');

  require('angular-ui-ace');
  require('angular-elastic');
  require('directives/confirm_click');

  // add the module deps to this module
  require('modules').get('app/settings', ['ui.ace', 'monospaced.elastic']);

  return {
    name: 'objects',
    display: 'Objects',
    url: '#/settings/objects'
  };
});
