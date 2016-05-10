module.exports = function () {
  var tlConfig = require('../../../handlers/lib/tl_config.js')({
    server: {},
    request: {}
  });

  tlConfig.time = {
    interval: '1s',
    from: 1000,
    to: 4001
  };

  tlConfig.setTargetSeries();

  return tlConfig;
};
