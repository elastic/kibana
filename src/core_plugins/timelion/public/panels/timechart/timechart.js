const Panel = require('plugins/timelion/panels/panel');
const panelRegistry = require('plugins/timelion/lib/panel_registry');

panelRegistry.register(function timeChartProvider(Private) {
  // Schema is broken out so that it may be extended for use in other plugins
  // Its also easier to test.
  return new Panel('timechart', Private(require('./schema'))());
});
