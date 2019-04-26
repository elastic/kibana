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

import { getLastSeriesTimestamp } from './timestamp';

describe('src/legacy/core_plugins/metrics/server/lib/vis_data/helpers/timestamp.js', () => {
  let series;
  const lastTimestamp = 10000;

  beforeEach(() => {
    series = [
      [
        {
          id: 1,
          data: [
            [100, 43],
            [1000, 56],
            [lastTimestamp, 59],
          ],
        },
        {
          id: 1,
          data: [
            [100, 33],
            [1000, 16],
            [lastTimestamp, 29],
          ],
        },
      ],
      [
        {
          id: 2,
          data: [
            [100, 3],
            [1000, 6],
            [lastTimestamp, 9],
          ],
        },
        {
          id: 2,
          data: [
            [100, 5],
            [1000, 7],
            [lastTimestamp, 9],
          ],
        },
      ],
    ];
  });

  describe('getLastSeriesTimestamp()', () => {
    test('should return the last timestamp', () => {
      const timestamp = getLastSeriesTimestamp(series);

      expect(timestamp).toBe(lastTimestamp);
    });

    test('should return the max last timestamp of series', () => {
      const maxLastTimestamp = 20000;

      series[0][1].data = [[100, 5], [1000, 7], [maxLastTimestamp, 50]];

      const timestamp = getLastSeriesTimestamp(series);

      expect(timestamp).toBe(maxLastTimestamp);
    });

    test('should return null if nothing is passed', () => {
      const timestamp = getLastSeriesTimestamp();

      expect(timestamp).toBe(null);
    });
  });
});
