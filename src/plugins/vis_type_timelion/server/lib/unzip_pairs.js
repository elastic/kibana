/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

export default function unzipPairs(timeValObject) {
  const paired = _.chain(timeValObject)
    .toPairs()
    .map(function (point) {
      return [parseInt(point[0], 10), point[1]];
    })
    .sortBy(function (point) {
      return point[0];
    })
    .value();
  return paired;
}
