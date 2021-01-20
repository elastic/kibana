/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { dataArray as createArr } from './data_array';
import { uniqLabels as getArrOfUniqLabels } from './uniq_labels';

/*
 * Accepts a Kibana data object and returns an array of unique labels (strings).
 * Extracts the field formatter from the raw object and passes it to the
 * getArrOfUniqLabels function.
 *
 * Currently, this service is only used for vertical bar charts and line charts.
 */
export function labels(obj) {
  if (!_.isObject(obj)) {
    throw new TypeError('LabelUtil expects an object');
  }
  return getArrOfUniqLabels(createArr(obj));
}
