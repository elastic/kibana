module.exports = function (kibana) {
  return new kibana.Plugin({
    exports: {
      spyModes: [
        'plugins/vis_debug_spy/index'
      ]
    }
  });
};
