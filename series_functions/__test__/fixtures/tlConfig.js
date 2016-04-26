module.exports = function () {
  var tlConfig = require('../../../handlers/lib/tl_config.js')({
    server: {},
    request: {}
  });

  tlConfig.setTargetSeries([1000, 2000, 3000, 4000]);
};
