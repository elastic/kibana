import moment from 'moment';

/**
 * Converts the time to a string, if it isn't already.
 * @param time {string|Moment}
 * @returns {string}
 */
function convertTimeToString(time) {
  return typeof time === 'string' ? time : moment(time).toString();
}
