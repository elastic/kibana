/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { flattenSeries } from './flatten_series';

/*
 * Accepts a Kibana data object and returns an array of values objects.
 */
export function dataArray(obj) {
  if (!_.isObject(obj) || (!obj.rows && !obj.columns && !obj.series)) {
    throw new TypeError(
      'GetArrayUtilService expects an object with a series, rows, or columns key'
    );
  }

  if (!obj.series) return flattenSeries(obj);
  return obj.series;
}
