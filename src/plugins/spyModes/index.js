module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        'plugins/spyModes/tableSpyMode',
        'plugins/spyModes/reqRespStatsSpyMode'
      ]
    }
  });
};
