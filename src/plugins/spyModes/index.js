module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        'tableSpyMode.js',
        'reqRespStatsSpyMode.js',
      ]
    }
  });
};
