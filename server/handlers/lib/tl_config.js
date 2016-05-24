var _ = require('lodash');
var config = require('../../../timelion.json');
try {config = _.merge(config, require('../../../timelion.private.json'));} catch (e) {}; //eslint-disable-line no-empty

var buildTarget = require('../../lib/build_target.js');

module.exports = function (setup) {
  var targetSeries;

  var tlConfig = {
    time: {
      from: 'now-12M',
      to: 'now',
      interval: config.default_interval
    },
    file: config,
    getTargetSeries: function () {
      return _.map(targetSeries, function (bucket) { // eslint-disable-line no-use-before-define
        return [bucket, null];
      });
    },
    setTargetSeries: function () {
      targetSeries = buildTarget(this);
    },
    writeTargetSeries: function (series) {
      targetSeries = _.map(series, function (p) {return p[0];});
    }
  };

  tlConfig = _.extend(tlConfig, setup);
  return tlConfig;
};
