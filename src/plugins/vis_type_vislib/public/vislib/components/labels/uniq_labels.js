/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

/*
 * Accepts an array of data objects and a formatter function.
 * Returns a unique list of formatted labels (strings).
 */
export function uniqLabels(arr) {
  if (!Array.isArray(arr)) {
    throw new TypeError('UniqLabelUtil expects an array of objects');
  }

  return _(arr).map('label').uniq().value();
}
