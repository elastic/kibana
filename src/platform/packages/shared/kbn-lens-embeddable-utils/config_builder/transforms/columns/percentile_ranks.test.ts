/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromPercentileRanksAPItoLensState,
  fromPercentileRankLensStateToAPI,
} from './percentile_ranks';
import type { PercentileRanksIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiPercentileRanksOperation } from '../../schema/metric_ops';
import { LENS_PERCENTILE_RANK_DEFAULT_VALUE } from '../../schema/constants';

describe('Percentile Ranks Transforms', () => {
  describe('fromPercentileRanksAPItoLensState', () => {
    it('should transform basic percentile ranks configuration', () => {
      const input: LensApiPercentileRanksOperation = {
        operation: 'percentile_rank',
        field: 'response_time',
        rank: 95,
      };

      const expected: PercentileRanksIndexPatternColumn = {
        customLabel: false,
        filter: undefined,
        operationType: 'percentile_rank',
        sourceField: 'response_time',
        label: '',
        isBucketed: false,
        dataType: 'number',
        params: {
          value: 95,
        },
      };

      expect(fromPercentileRanksAPItoLensState(input)).toEqual(expected);
    });

    it('should omit default rank value', () => {
      const input: LensApiPercentileRanksOperation = {
        operation: 'percentile_rank',
        field: 'response_time',
        rank: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
      };

      const expected: PercentileRanksIndexPatternColumn = {
        customLabel: false,
        filter: undefined,
        operationType: 'percentile_rank',
        sourceField: 'response_time',
        label: '',
        isBucketed: false,
        dataType: 'number',
        params: {
          value: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
        },
      };

      expect(fromPercentileRanksAPItoLensState(input)).toEqual(expected);
    });

    it('should use default rank when not provided', () => {
      const input: LensApiPercentileRanksOperation = {
        operation: 'percentile_rank',
        field: 'response_time',
        rank: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
      };

      const result = fromPercentileRanksAPItoLensState(input);
      expect(result.params.value).toBe(LENS_PERCENTILE_RANK_DEFAULT_VALUE);
    });

    it('should handle custom label', () => {
      const input: LensApiPercentileRanksOperation = {
        operation: 'percentile_rank',
        field: 'response_time',
        rank: 95,
        label: 'PR95 Response Time',
      };

      const result = fromPercentileRanksAPItoLensState(input);
      expect(result.label).toBe('PR95 Response Time');
    });
  });

  describe('fromPercentileRankLensStateToAPI', () => {
    it('should transform basic percentile ranks configuration', () => {
      const input: PercentileRanksIndexPatternColumn = {
        operationType: 'percentile_rank',
        sourceField: 'response_time',
        label: 'Percentile rank (95) of response_time',
        isBucketed: false,
        dataType: 'number',
        params: {
          value: 95,
        },
      };

      const expected: LensApiPercentileRanksOperation = {
        operation: 'percentile_rank',
        field: 'response_time',
        rank: 95,
      };

      expect(fromPercentileRankLensStateToAPI(input)).toEqual(expected);
    });

    it('should use default rank when not provided in params', () => {
      const input: PercentileRanksIndexPatternColumn = {
        operationType: 'percentile_rank',
        sourceField: 'response_time',
        label: 'Percentile rank of response_time',
        isBucketed: false,
        dataType: 'number',
        params: {
          value: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
        },
      };

      const result = fromPercentileRankLensStateToAPI(input);
      expect(result.rank).toBe(LENS_PERCENTILE_RANK_DEFAULT_VALUE);
    });

    it('should handle custom label', () => {
      const input: PercentileRanksIndexPatternColumn = {
        operationType: 'percentile_rank',
        sourceField: 'response_time',
        label: 'PR95 Response Time',
        customLabel: true,
        isBucketed: false,
        dataType: 'number',
        params: {
          value: 95,
        },
      };

      const result = fromPercentileRankLensStateToAPI(input);
      expect(result.label).toBe('PR95 Response Time');
    });
  });
});
