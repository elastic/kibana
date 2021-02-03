/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';

/**
 * Format a milliseconds value as a string
 *
 * @param {number} val
 * @return {string}
 */
export function ms(val) {
  const duration = moment.duration(val);
  if (duration.days() >= 1) {
    return duration.days().toFixed(1) + 'd';
  }

  if (duration.hours() >= 1) {
    return duration.hours().toFixed(1) + 'h';
  }

  if (duration.minutes() >= 1) {
    return duration.minutes().toFixed(1) + 'm';
  }

  if (duration.seconds() >= 1) {
    return duration.as('seconds').toFixed(1) + 's';
  }

  return val + 'ms';
}
