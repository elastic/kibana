/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

/*
 * Accepts a Kibana data object, flattens the data.series values array,
 * and returns an array of values objects.
 */
export function flattenData(obj) {
  let charts;

  if (!_.isObject(obj) || (!obj.rows && !obj.columns && !obj.series)) {
    throw new TypeError('flattenData expects an object with a series, rows, or columns key');
  }

  if (!obj.series) {
    charts = obj.rows ? obj.rows : obj.columns;
  }

  return _(charts ? charts : [obj])
    .map('series')
    .flattenDeep()
    .map('values')
    .flattenDeep()
    .filter(Boolean)
    .value();
}
