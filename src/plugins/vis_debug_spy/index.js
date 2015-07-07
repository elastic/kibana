module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        'plugins/vis_debug_spy/vis_debug_spy'
      ]
    }
  });
};
