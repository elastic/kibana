/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

      series[0][1].data = [
        [100, 5],
        [1000, 7],
        [maxLastTimestamp, 50],
      ];

      const timestamp = getLastSeriesTimestamp(series);

      expect(timestamp).toBe(maxLastTimestamp);
    });

    test('should return null if nothing is passed', () => {
      const timestamp = getLastSeriesTimestamp();

      expect(timestamp).toBe(null);
    });
  });
});
