module.exports = (kibana) => {
  if (!kibana.config.get('env.dev')) return;
  return new kibana.Plugin({
    ui: {
      spyModes: [
        'visDebugSpyPanel.js'
      ]
    }
  });
};
