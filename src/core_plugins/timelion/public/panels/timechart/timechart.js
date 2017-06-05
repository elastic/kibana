import Panel from 'plugins/timelion/panels/panel';
import panelRegistry from 'plugins/timelion/lib/panel_registry';

panelRegistry.register(function timeChartProvider(Private) {
  // Schema is broken out so that it may be extended for use in other plugins
  // Its also easier to test.
  return new Panel('timechart', Private(require('./schema'))());
});
