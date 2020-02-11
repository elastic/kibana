/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

// Upsampling and down sampling of non-cumulative sets
// Good: min, max, average
// Bad: sum, count

export default function average(dataTuples, targetTuples) {
  // Phase 1: Downsample
  // We necessarily won't well match the dataSource here as we don't know how much data
  // they had when creating their own average
  const resultTimes = _.pluck(targetTuples, 0);
  const dataTuplesQueue = _.clone(dataTuples);
  const resultValues = _.map(targetTuples, function(bucket) {
    const time = bucket[0];
    let i = 0;
    const avgSet = [];

    // This is naive, it doesn't consider where the line is going next,
    // It simply writes the point and moves on once it hits <= time.
    // Thus this algorithm will tend to lag the trend.
    // Deal with it, or write something better.
    while (i < dataTuplesQueue.length && dataTuplesQueue[i][0] <= time) {
      avgSet.push(dataTuplesQueue[i][1]);
      i++;
    }

    dataTuplesQueue.splice(0, i);

    const sum = avgSet.reduce((sum, num) => sum + num, 0);

    return avgSet.length ? sum / avgSet.length : NaN;
  });

  // Phase 2: Upsample if needed
  // If we have any NaNs we are probably resampling from a big interval to a small one (eg, 1M as 1d)
  // So look for the missing stuff in the array, and smooth it out
  const naNIndex = _.findIndex(resultValues, function(val) {
    return isNaN(val);
  });

  if (naNIndex > -1) {
    let i = 0;
    let naNCount = 0;
    const filledValues = [];
    let previousRealNumber;
    let stepSize;
    while (i < resultValues.length) {
      if (isNaN(resultValues[i])) {
        if (i === 0) {
          // If our first number is NaN, initialize from dataTuples;
          previousRealNumber = dataTuples[0][1];
        }
        naNCount++;
      } else {
        // Otherwise, backfill the NaNs with averaged out data
        if (naNCount > 0) {
          stepSize = (resultValues[i] - previousRealNumber) / (naNCount + 1);
          while (naNCount > 0) {
            resultValues[i - naNCount] = previousRealNumber + stepSize;
            previousRealNumber = resultValues[i - naNCount];
            naNCount--;
          }
        }
        previousRealNumber = resultValues[i];
        filledValues.push(resultValues[i]);
      }
      i++;
    }
  }

  const resultTuples = _.zip(resultTimes, resultValues);
  return resultTuples;
}
