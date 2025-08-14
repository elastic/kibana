/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  metricOperationDefinitionSchema,
  staticOperationDefinitionSchema,
  formulaOperationDefinitionSchema,
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  metricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
  differencesOperationSchema,
  movingAverageOperationSchema,
  cumulativeSumOperationSchema,
  counterRateOperationSchema,
} from './metric_ops';

describe('Metric Operations Schemas', () => {
  describe('staticOperationDefinition', () => {
    it('validates a valid static value configuration', () => {
      const input = {
        operation: 'static_value' as const,
        value: 42,
        label: 'Static Value',
      };

      const validated = staticOperationDefinitionSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing value', () => {
      const input = {
        operation: 'static_value' as const,
      };

      expect(() => staticOperationDefinitionSchema.validate(input)).toThrow();
    });
  });

  describe('formulaOperationDefinition', () => {
    it('validates a valid formula configuration', () => {
      const input = {
        operation: 'formula' as const,
        formula: 'count(col1) / sum(col2)',
        label: 'Custom Formula',
      };

      const validated = formulaOperationDefinitionSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing formula', () => {
      const input = {
        operation: 'formula' as const,
      };

      expect(() => formulaOperationDefinitionSchema.validate(input)).toThrow();
    });
  });

  describe('fieldBasedOperations', () => {
    it('validates count metric operation', () => {
      const input = {
        operation: 'count' as const,
        field: 'my_field',
        empty_as_null: true,
        time_scale: 's' as const,
        filter: {
          language: 'kuery' as const,
          query: 'status:active',
        },
      };

      const validated = countMetricOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates unique count metric operation', () => {
      const input = {
        operation: 'unique_count' as const,
        field: 'user_id',
        empty_as_null: true,
      };

      const validated = uniqueCountMetricOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates basic metric operations', () => {
      const operations = ['min', 'max', 'sum', 'avg', 'median'] as const;

      operations.forEach((op) => {
        const input = {
          operation: op,
          field: 'price',
          time_scale: 'h' as const,
        };

        const validated = metricOperationSchema.validate(input);
        expect(validated).toEqual(input);
      });
    });
  });

  describe('advanced metric operations', () => {
    it('validates percentile operation', () => {
      const input = {
        operation: 'percentile' as const,
        field: 'response_time',
        percentile: 95,
      };

      const validated = percentileOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates percentile ranks operation', () => {
      const input = {
        operation: 'percentile_ranks' as const,
        field: 'response_time',
        ranks: [50, 75, 90, 95],
      };

      const validated = percentileRanksOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates differences operation', () => {
      const input = {
        operation: 'differences' as const,
        of: {
          operation: 'sum' as const,
          field: 'value',
        },
      };

      const validated = differencesOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates moving average operation', () => {
      const input = {
        operation: 'moving_average' as const,
        of: {
          operation: 'sum' as const,
          field: 'value',
        },
        window: 7,
      };

      const validated = movingAverageOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('time-based operations', () => {
    it('validates cumulative sum operation', () => {
      const input = {
        operation: 'cumulative_sum' as const,
        field: 'value',
      };

      const validated = cumulativeSumOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates counter rate operation', () => {
      const input = {
        operation: 'counter_rate' as const,
        field: 'value',
      };

      const validated = counterRateOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates last value operation', () => {
      const input = {
        operation: 'last_value' as const,
        field: 'status',
      };

      const validated = lastValueOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('metricOperationDefinition', () => {
    it('validates all operation types', () => {
      const operations = [
        {
          operation: 'formula' as const,
          formula: 'count(col1)',
        },
        {
          operation: 'static_value' as const,
          value: 42,
        },
        {
          operation: 'count' as const,
          field: 'my_field',
        },
        {
          operation: 'sum' as const,
          field: 'value',
        },
        {
          operation: 'percentile' as const,
          field: 'response_time',
          percentile: 95,
        },
      ];

      operations.forEach((op) => {
        const validated = metricOperationDefinitionSchema.validate(op);
        expect(validated).toEqual(op);
      });
    });

    it('throws on invalid operation type', () => {
      const input = {
        operation: 'invalid_operation' as const,
        field: 'value',
      };

      expect(() => metricOperationDefinitionSchema.validate(input)).toThrow();
    });
  });
});
