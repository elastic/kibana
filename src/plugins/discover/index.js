define(function (require, module, exports) {
  require('plugins/discover/directives/table');
  require('plugins/discover/saved_searches/saved_searches');
  require('plugins/discover/directives/timechart');
  require('plugins/discover/components/field_chooser/field_chooser');
  require('plugins/discover/controllers/discover');
  require('css!plugins/discover/styles/main.css');

  var apps = require('registry/apps');
  apps.register(function DiscoverAppModule() {
    return {
      id: 'discover',
      name: 'Discover',
      order: 0
    };
  });
});