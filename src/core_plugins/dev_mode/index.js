export default (kibana) => {
  return new kibana.Plugin({
    isEnabled(config) {
      return (
        config.get('env.dev') &&
        config.get('dev_mode.enabled')
      );
    },

    uiExports: {
      spyModes: [
        'plugins/dev_mode/vis_debug_spy_panel'
      ]
    }
  });
};
