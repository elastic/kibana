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

import {
  getLastSeriesTimestamp,
  makeFilter,
  annotationFilter,
  ERROR_DATA_MESSAGE,
  ERROR_SERIES_MESSAGE
} from './annotations';

describe('src/legacy/core_plugins/metrics/common/annotations.test.js', () => {
  let series;
  let annotations;
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
    annotations = {
      'id1': [
        {
          key: 100,
        },
        {
          key: 1000,
        },
        {
          key: 10000,
        }
      ],
      'id2': [
        {
          key: 100,
        },
        {
          key: 1000,
        },
        {
          key: 10000,
        }
      ],
    };
  });

  describe('getLastSeriesTimestamp()', () => {
    test('should return last timestamp', () => {
      const timestamp = getLastSeriesTimestamp(series);

      expect(timestamp).toBe(lastTimestamp);
    });

    test('should throw Error if last timestamps are different', () => {
      series[1][1].data = [[1, 2], [2, 3], [3, 4]];

      try {
        getLastSeriesTimestamp(series);
      } catch (e) {
        expect(e.message).toBe(ERROR_DATA_MESSAGE);
      }
    });

    test('should throw Error if series don\'t exist', () => {
      try {
        getLastSeriesTimestamp([]);
      } catch (e) {
        expect(e.message).toBe(ERROR_SERIES_MESSAGE);
      }
    });
  });

  describe('makeFilter()', () => {
    test('should call accepted filter with accepted data and value', () => {
      const by = jest.fn();
      const value = 42;
      const data = [];

      makeFilter(by)(value)(data);

      expect(by).toHaveBeenCalledWith(data, value);
    });
  });

  describe('annotationFilter()', () => {
    test('should filter annotations by passed value correctly', () => {
      const expectedResult = {
        'id1': [
          {
            key: 100,
          },
          {
            key: 1000,
          },
        ],
        'id2': [
          {
            key: 100,
          },
          {
            key: 1000,
          },
        ],
      };

      expect(annotationFilter(annotations, 1000)).toEqual(expectedResult);
    });
  });
});
