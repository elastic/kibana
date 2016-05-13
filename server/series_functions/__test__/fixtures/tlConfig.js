var moment = require('moment');

module.exports = function () {
  var tlConfig = require('../../../handlers/lib/tl_config.js')({
    server: {},
    request: {}
  });

  tlConfig.time = {
    interval: '1y',
    from: moment('1980-01-01T00:00:00Z'),
    to: moment('1983-01-01T00:00:00Z'),
  };

  tlConfig.setTargetSeries();

  return tlConfig;
};
