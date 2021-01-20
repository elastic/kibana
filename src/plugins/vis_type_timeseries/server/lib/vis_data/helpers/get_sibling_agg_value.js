/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

export const getSiblingAggValue = (row, metric) => {
  let key = metric.type.replace(/_bucket$/, '');
  if (key === 'std_deviation' && _.includes(['upper', 'lower'], metric.mode)) {
    key = `std_deviation_bounds.${metric.mode}`;
  }
  return _.get(row, `${metric.id}.${key}`);
};
