/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getMetricLabel,
  isBasicAgg,
  getAggByPredicate,
  getAggsByPredicate,
  getAggsByType,
} from './agg_utils';
import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { TSVB_METRIC_TYPES } from './enums';
import type { Metric } from './types';

describe('agg utils', () => {
  describe('isBasicAgg(metric)', () => {
    it('returns true for a basic metric (count)', () => {
      expect(isBasicAgg({ type: 'count' } as Metric)).toEqual(true);
    });
    it('returns false for a pipeline metric (derivative)', () => {
      expect(isBasicAgg({ type: 'derivative' } as Metric)).toEqual(false);
    });
  });

  describe('getMetricLabel(metricType)', () => {
    it('should return "Cumulative Sum" for METRIC_TYPES.CUMULATIVE_SUM', () => {
      const label = getMetricLabel(METRIC_TYPES.CUMULATIVE_SUM);
      expect(label).toBe('Cumulative Sum');
    });

    it('should return "Static Value" for TSVB_METRIC_TYPES.STATIC', () => {
      const label = getMetricLabel(TSVB_METRIC_TYPES.STATIC);
      expect(label).toBe('Static Value');
    });
  });

  describe('getAggByPredicate(metricType, metaPredicate)', () => {
    it('should be falsy for METRIC_TYPES.SUM with { hasExtendedStats: true } meta predicate', () => {
      const actual = getAggByPredicate(METRIC_TYPES.SUM, { hasExtendedStats: true });
      expect(actual).toBeFalsy();
    });

    it('should be truthy for TSVB_METRIC_TYPES.SUM_OF_SQUARES with { hasExtendedStats: true } meta predicate', () => {
      const actual = getAggByPredicate(TSVB_METRIC_TYPES.SUM_OF_SQUARES, {
        hasExtendedStats: true,
      });
      expect(actual).toBeTruthy();
    });
  });

  describe('getAggsByPredicate(predicate)', () => {
    it('should return actual array of aggs with { meta: { hasExtendedStats: true } } predicate', () => {
      const commonProperties = {
        type: 'metric',
        isFieldRequired: true,
        isFilterRatioSupported: false,
        isHistogramSupported: false,
        isFieldFormattingDisabled: false,
        hasExtendedStats: true,
      };
      const expected = [
        {
          id: TSVB_METRIC_TYPES.STD_DEVIATION,
          meta: {
            label: 'Std. Deviation',
            ...commonProperties,
          },
        },
        {
          id: TSVB_METRIC_TYPES.SUM_OF_SQUARES,
          meta: {
            label: 'Sum of Squares',
            ...commonProperties,
          },
        },
        {
          id: TSVB_METRIC_TYPES.VARIANCE,
          meta: {
            label: 'Variance',
            ...commonProperties,
          },
        },
      ];

      const actual = getAggsByPredicate({ meta: { hasExtendedStats: true } });
      expect(actual).toEqual(expected);
    });

    it('should return actual array of aggs with { meta: { isFieldRequired: false } } predicate', () => {
      const commonProperties = {
        isFieldRequired: false,
        isFilterRatioSupported: false,
        isHistogramSupported: false,
        isFieldFormattingDisabled: false,
        hasExtendedStats: false,
      };
      const expected = [
        {
          id: METRIC_TYPES.COUNT,
          meta: {
            type: 'metric',
            label: 'Count',
            ...commonProperties,
            isFilterRatioSupported: true,
            isHistogramSupported: true,
          },
        },
        {
          id: TSVB_METRIC_TYPES.FILTER_RATIO,
          meta: {
            type: 'metric',
            label: 'Filter Ratio',
            ...commonProperties,
          },
        },
        {
          id: TSVB_METRIC_TYPES.STATIC,
          meta: {
            type: 'metric',
            label: 'Static Value',
            ...commonProperties,
          },
        },
        {
          id: TSVB_METRIC_TYPES.SERIES_AGG,
          meta: {
            type: 'special',
            label: 'Series Agg',
            ...commonProperties,
          },
        },
      ];

      const actual = getAggsByPredicate({ meta: { isFieldRequired: false } });
      expect(actual).toEqual(expected);
    });
  });

  describe('getAggsByType(mapFn)', () => {
    it('should return object with actual aggs labels separated by type', () => {
      const expected = {
        metric: [
          'Average',
          'Cardinality',
          'Count',
          'Filter Ratio',
          'Counter Rate',
          'Max',
          'Min',
          'Percentile',
          'Percentile Rank',
          'Static Value',
          'Std. Deviation',
          'Sum',
          'Sum of Squares',
          'Top Hit',
          'Value Count',
          'Variance',
        ],
        parent_pipeline: [
          'Bucket Script',
          'Cumulative Sum',
          'Derivative',
          'Moving Average',
          'Positive Only',
          'Serial Difference',
        ],
        sibling_pipeline: [
          'Overall Average',
          'Overall Max',
          'Overall Min',
          'Overall Std. Deviation',
          'Overall Sum',
          'Overall Sum of Squares',
          'Overall Variance',
        ],
        special: ['Series Agg', 'Math'],
      };

      const actual = getAggsByType((agg) => agg.meta.label);
      expect(actual).toEqual(expected);
    });
  });
});
