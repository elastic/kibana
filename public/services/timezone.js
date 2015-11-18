define(function (require) {
  var tzDetect = require('jstimezonedetect').jstz;
  var moment = require('moment');

  return function timezoneFn(config, Private) {
    return function () {
      var configuredTZ = config.get('dateFormat:tz', 'Browser');
      var configDefaults = Private(require('ui/config/defaults'));
      var detectedTimezone = tzDetect.determine().name();
      var isDefaultTimezone;

      try {
        isDefaultTimezone = configuredTZ === configDefaults['dateFormat:tz'].value;
      } catch (e) {
        return detectedTimezone;
      }

      var timezone = isDefaultTimezone ?
        (detectedTimezone || moment().format('Z')) :
        configuredTZ;

      return timezone;
    };
  };
});
