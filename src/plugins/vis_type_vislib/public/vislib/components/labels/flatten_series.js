/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

/*
 * Accepts a Kibana data object with a rows or columns key
 * and returns an array of flattened series values.
 */
export function flattenSeries(obj) {
  if (!_.isObject(obj) || (!obj.rows && !obj.columns)) {
    throw new TypeError('GetSeriesUtilService expects an object with either a rows or columns key');
  }

  obj = obj.rows ? obj.rows : obj.columns;

  return _.chain(obj).map('series').flattenDeep().value();
}
