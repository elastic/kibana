/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Time Range data modes.
 * @constant
 * @public
 */
export enum TIME_RANGE_DATA_MODES {
  /**
   * Entire timerange mode will match all the documents selected in the
   * timerange timepicker
   */
  ENTIRE_TIME_RANGE = 'entire_time_range',

  /**
   * Last value mode will match only the documents for the specified interval
   * from the end of the timerange.
   */
  LAST_VALUE = 'last_value',
}

/**
 * Key for getting the Time Range mode from the Panel configuration object.
 * @constant
 * @public
 */
export const TIME_RANGE_MODE_KEY = 'time_range_mode';
