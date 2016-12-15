export default (kibana) => {
  if (!kibana.config.get('env.dev')) return;
  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        'plugins/dev_mode/vis_debug_spy_panel'
      ]
    }
  });
};
