import moment from 'moment';
import timelionDefaults from '../../../lib/get_namespaced_settings';

module.exports = function () {
  const tlConfig = require('../../../handlers/lib/tl_config.js')({
    server: {},
    request: {}
  });

  tlConfig.time = {
    interval: '1y',
    from: moment('1980-01-01T00:00:00Z').valueOf(),
    to: moment('1983-01-01T00:00:00Z').valueOf(),
    timezone: 'Etc/UTC'
  };

  tlConfig.settings = timelionDefaults;

  tlConfig.setTargetSeries();

  return tlConfig;
};
