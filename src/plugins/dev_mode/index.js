module.exports = (kibana) => {
  if (!kibana.config.get('env.dev')) return;
  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        'plugins/devMode/visDebugSpyPanel'
      ]
    }
  });
};
