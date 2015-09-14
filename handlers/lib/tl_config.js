var _ = require('lodash');
var config = require('../../timelion.json');
var buildTarget = require('../../lib/build_target.js');
var targetSeries;

module.exports = {
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
  }
};