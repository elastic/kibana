/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

// Upsampling and downsampling of non-cumulative sets
// Good: average, min, max
// Bad: sum, count
export default function nearest(dataTuples, targetTuples) {
  return _.map(targetTuples, function (bucket) {
    const time = bucket[0];
    let i = 0;
    while (
      i < dataTuples.length - 1 &&
      (Math.abs(dataTuples[i + 1][0] - time) < Math.abs(dataTuples[i][0] - time) ||
        // TODO: Certain offset= args can cause buckets with duplicate times, e.g., offset=-1M
        // check for that, and only use the last of the duplicates. The reason this happens?
        // What is 1M before Mar 30th? What about 1M before Mar 31st? Both are the last day
        // in Feb. Something has to be chucked. If offsetting by M user might want to use
        // fit=average
        Math.abs(dataTuples[i + 1][0] - time) === Math.abs(dataTuples[i][0] - time))
    ) {
      i++;
    }

    const closest = dataTuples[i];
    dataTuples.splice(0, i);

    return [bucket[0], closest[1]];
  });
}
