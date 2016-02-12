module.exports = function (kibana) {
  return new kibana.Plugin({
    ui: {
      spyModes: [
        'tableSpyMode.js',
        'reqRespStatsSpyMode.js',
      ]
    }
  });
};
