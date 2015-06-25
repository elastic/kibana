module.exports = function (kibana) {
  return new kibana.Plugin({
    exports: {
      spyModes: [
        'plugins/vis-debug-spy/index'
      ]
    }
  });
};
