/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import dateMath from '@kbn/datemath';

export const parseScheduleDates = (time: string): moment.Moment | null => {
  const isValidDateString = !isNaN(Date.parse(time));
  const isValidInput = isValidDateString || time.trim().startsWith('now');
  const formattedDate = isValidDateString
    ? moment(time)
    : isValidInput
    ? dateMath.parse(time)
    : null;

  return formattedDate != null ? formattedDate : null;
};
