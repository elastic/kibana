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

/*
  Single exponential smoothing. Assuming even interval
*/

import _ from 'lodash';

export default function ses(points, alpha) {
  let origin;
  let level;

  const smoothedPoints = _.reduce(
    points,
    (result, point, i) => {
      if (i === 0) {
        origin = point;
        level = point;
      } else {
        // In the case that point[1] is null, we keep origin the same
        // and forecast the point based on the previous smoothed point
        if (point != null) {
          origin = point;
        }
        if (origin == null) {
          level = null;
        } else {
          const prevSmoothed = result[i - 1];
          level = alpha * origin + (1 - alpha) * prevSmoothed;
        }
      }

      result.push(level);
      return result;
    },
    []
  );

  return smoothedPoints;
}
