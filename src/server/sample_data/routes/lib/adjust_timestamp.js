
const MILLISECONDS_IN_DAY = 86400000;

/**
 * Convert timestamp to timestamp that is relative to now
 *
 * @param {String} timestamp ISO8601 formated data string YYYY-MM-dd'T'HH:mm:ss.SSS
 * @param {Date} currentTimeMarker "now" reference marker in sample dataset
 * @param {Date} now
 * @param {Boolean} preserveDayOfWeekTimeOfDay
 * @return {String} ISO8601 formated data string YYYY-MM-dd'T'HH:mm:ss.SSS of timestamp adjusted to now
 */
export function adjustTimestamp(timestamp, currentTimeMarker, now, preserveDayOfWeekTimeOfDay) {
  const timestampDate = new Date(Date.parse(timestamp));

  if (!preserveDayOfWeekTimeOfDay) {
    // Move timestamp relative to now, preserving distance between currentTimeMarker and timestamp
    const timeDelta = timestampDate.getTime() - currentTimeMarker.getTime();
    return (new Date(now.getTime() + timeDelta)).toISOString();
  }

  // Move timestamp to current week, preserving day of week and time of day
  const weekDelta = Math.round((timestampDate.getTime() - currentTimeMarker.getTime()) / (MILLISECONDS_IN_DAY * 7));
  const dayOfWeekDelta = timestampDate.getUTCDay() - now.getUTCDay();
  const daysDelta = dayOfWeekDelta * MILLISECONDS_IN_DAY + (weekDelta * MILLISECONDS_IN_DAY * 7);
  const yearMonthDay = (new Date(now.getTime() + daysDelta)).toISOString().substring(0, 10);
  return `${yearMonthDay}T${timestamp.substring(11)}`;

}
