import _ from 'lodash';
import buildTarget from '../../lib/build_target.js';

module.exports = function (setup) {
  let targetSeries;

  let tlConfig = {
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
