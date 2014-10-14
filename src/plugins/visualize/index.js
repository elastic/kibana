define(function (require) {
  require('css!plugins/visualize/styles/main.css');

  require('plugins/visualize/editor/editor');
  require('plugins/visualize/wizard/wizard');

  var apps = require('registry/apps');
  apps.register(function VisualizeAppModule() {
    return {
      name: 'Visualize',
      route: '/visualize/step/1'
    };
  });
});