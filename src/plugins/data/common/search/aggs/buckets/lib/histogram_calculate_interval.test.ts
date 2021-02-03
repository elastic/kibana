/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  calculateHistogramInterval,
  CalculateHistogramIntervalParams,
} from './histogram_calculate_interval';
import { ES_FIELD_TYPES } from '../../../../types';

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
        esTypes: [],
      };
    });

    describe('maxBucketsUserInput is defined', () => {
      test('should set 1 as an interval for integer numbers that are less than maxBuckets #1', () => {
        const p = {
          ...params,
          maxBucketsUserInput: 100,
          values: {
            min: 1,
            max: 50,
          },
          esTypes: [ES_FIELD_TYPES.INTEGER],
        };
        expect(calculateHistogramInterval(p)).toEqual(1);
      });

      test('should set 1 as an interval for integer numbers that are less than maxBuckets #2', () => {
        const p = {
          ...params,
          maxBucketsUiSettings: 1000,
          maxBucketsUserInput: 258,
          values: {
            min: 521,
            max: 689,
          },
          esTypes: [ES_FIELD_TYPES.INTEGER],
        };
        expect(calculateHistogramInterval(p)).toEqual(1);
      });

      test('should set correct interval for integer numbers that are greater than maxBuckets #1', () => {
        const p = {
          ...params,
          maxBucketsUserInput: 100,
          values: {
            min: 400,
            max: 790,
          },
          esTypes: [ES_FIELD_TYPES.INTEGER, ES_FIELD_TYPES.SHORT],
        };
        expect(calculateHistogramInterval(p)).toEqual(5);
      });

      test('should set correct interval for integer numbers that are greater than maxBuckets #2', () => {
        // diff === 3456211; interval === 50000; buckets === 69
        const p = {
          ...params,
          maxBucketsUserInput: 100,
          values: {
            min: 567,
            max: 3456778,
          },
          esTypes: [ES_FIELD_TYPES.LONG],
        };
        expect(calculateHistogramInterval(p)).toEqual(50000);
      });

      test('should not set integer interval if the field type is float #1', () => {
        const p = {
          ...params,
          maxBucketsUserInput: 100,
          values: {
            min: 0,
            max: 1,
          },
          esTypes: [ES_FIELD_TYPES.FLOAT],
        };
        expect(calculateHistogramInterval(p)).toEqual(0.01);
      });

      test('should not set integer interval if the field type is float #2', () => {
        const p = {
          ...params,
          maxBucketsUserInput: 100,
          values: {
            min: 0,
            max: 1,
          },
          esTypes: [ES_FIELD_TYPES.INTEGER, ES_FIELD_TYPES.FLOAT],
        };
        expect(calculateHistogramInterval(p)).toEqual(0.01);
      });

      test('should not set interval which more than largest possible', () => {
        const p = {
          ...params,
          maxBucketsUserInput: 200,
          values: {
            min: 150,
            max: 250,
          },
          esTypes: [ES_FIELD_TYPES.SHORT],
        };
        expect(calculateHistogramInterval(p)).toEqual(1);
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
            esTypes: [ES_FIELD_TYPES.FLOAT],
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
            esTypes: [ES_FIELD_TYPES.FLOAT],
          })
        ).toBe(100);
      });
    });

    describe('maxBucketsUserInput is not defined', () => {
      test('should not set interval which more than largest possible', () => {
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 0,
              max: 100,
            },
            esTypes: [ES_FIELD_TYPES.BYTE],
          })
        ).toEqual(1);
      });

      test('should set intervals for integer numbers (diff less than maxBucketsUiSettings)', () => {
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 1,
              max: 10,
            },
            esTypes: [ES_FIELD_TYPES.INTEGER],
          })
        ).toEqual(1);
      });

      test('should set intervals for integer numbers (diff more than maxBucketsUiSettings)', () => {
        // diff === 44445; interval === 500; buckets === 89
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 45678,
              max: 90123,
            },
            esTypes: [ES_FIELD_TYPES.INTEGER],
          })
        ).toEqual(500);
      });

      test('should set intervals the same for the same interval', () => {
        // both diffs are the same
        // diff === 1.655; interval === 0.02; buckets === 82
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 1.245,
              max: 2.9,
            },
            esTypes: [ES_FIELD_TYPES.FLOAT],
          })
        ).toEqual(0.02);
        expect(
          calculateHistogramInterval({
            ...params,
            values: {
              min: 0.5,
              max: 2.3,
            },
            esTypes: [ES_FIELD_TYPES.FLOAT],
          })
        ).toEqual(0.02);
      });

      test('should correctly fallback to the default value for empty string', () => {
        expect(
          calculateHistogramInterval({
            ...params,
            maxBucketsUserInput: '',
            values: {
              min: 0.1,
              max: 0.9,
            },
            esTypes: [ES_FIELD_TYPES.FLOAT],
          })
        ).toBe(0.01);
      });
    });
  });
});
