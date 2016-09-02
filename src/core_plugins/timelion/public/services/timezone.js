const tzDetect = require('jstimezonedetect').jstz;
const moment = require('moment');

module.exports = function timezoneFn(config, Private) {
  return function () {

    if (config.isDefault('dateFormat:tz')) {
      const detectedTimezone = tzDetect.determine().name();
      if (detectedTimezone) return detectedTimezone;
      else return moment().format('Z');
    } else {
      return config.get('dateFormat:tz', 'Browser');
    }

  };
};
