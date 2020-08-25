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
  calculateHistogramInterval,
  CalculateHistogramIntervalParams,
} from './histogram_calculate_interval';

const getLargestPossibleInterval = (params: CalculateHistogramIntervalParams) => {
  const diff = params.values!.max - params.values!.min;
  return diff / params.maxBucketsUiSettings;
};

describe('calculateHistogramInterval', () => {
  describe('auto calculating mode', () => {
    let params: CalculateHistogramIntervalParams;

    beforeEach(() => {
      params = {
        interval: 'auto',
        intervalBase: undefined,
        maxBucketsUiSettings: 100,
        maxBucketsUserInput: undefined,
        values: {
          min: 0,
          max: 1,
        },
      };
    });

    describe('maxBucketsUserInput is defined', () => {
      test('should not set interval which more than largest possible', () => {
        const p = {
          ...params,
          maxBucketsUserInput: 200,
          values: {
            min: 150,
            max: 250,
          },
        };
        const expectedInterval = getLargestPossibleInterval(p);

        expect(expectedInterval).toBe(1);
        expect(calculateHistogramInterval(p)).toBe(expectedInterval);
      });

      test('should correctly work for float numbers (small numbers)', () => {
        expect(
          calculateHistogramInterval({
            ...params,
            maxBucketsUserInput: 50,
            values: {
              min: 0.1,
              max: 0.9,
            },
          })
        ).toBe(0.02);
      });

      test('should correctly work for float numbers (big numbers)', () => {
        expect(
          calculateHistogramInterval({
            ...params,
            maxBucketsUserInput: 10,
            values: {
              min: 10.45,
              max: 1000.05,
            },
          })
        ).toBe(100);
      });
    });

    describe('maxBucketsUserInput is not defined', () => {
      test('should not set interval which more than largest possible', () => {
        const p = {
          ...params,
          values: {
            min: 0,
            max: 100,
          },
        };
        const expectedInterval = getLargestPossibleInterval(p);

        expect(expectedInterval).toBe(1);
        expect(calculateHistogramInterval(p)).toBe(expectedInterval);
      });

      test('should set intervals for integer numbers (diff less than maxBucketsUiSettings)', () => {
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 1,
              max: 10,
            },
          })
        ).toBe(1);
      });

      test('should set intervals for integer numbers (diff more than maxBucketsUiSettings)', () => {
        // diff === 44445; interval === 2000; buckets === 22
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 45678,
              max: 90123,
            },
          })
        ).toBe(2000);
      });

      test('should set intervals for float numbers (small numbers)', () => {
        // diff === 1.655; interval === 0.03; buckets === 55
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 1.245,
              max: 2.9,
            },
          })
        ).toBe(0.03);
      });

      test('should set intervals for float numbers (small numbers #2)', () => {
        // diff === 1.655; interval === 0.02; buckets === 82
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 0.5,
              max: 2.3,
            },
          })
        ).toBe(0.02);
      });
    });
  });
});
