/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';

export const labelDateFormatter = (label: string, dateformat = 'lll') => {
  let formattedLabel = label;
  // Use moment isValid function on strict mode
  const isDate = moment(label, '', true).isValid();
  if (isDate) {
    formattedLabel = moment(label).format(dateformat);
  }
  return formattedLabel;
};
