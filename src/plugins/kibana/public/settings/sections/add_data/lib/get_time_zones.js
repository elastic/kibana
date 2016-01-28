const moment = require('moment');

export default function getTimeZones() {
  const moment_tz = moment.tz._zones;
  const result = [];

  for (const key in moment_tz) {
    if (moment_tz.hasOwnProperty(key)) {
      const tz = moment_tz[key];
      const parts = tz.split('|');
      result.push({
        timezoneId: parts[0],
        default: (parts[0] === 'Etc/UTC')
      });
    }
  }

  return result;
}
