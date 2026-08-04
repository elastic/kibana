/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectPrettyError } from '@kbn/zod-helpers/v4';
import {
  bucketDateHistogramOperationSchema,
  bucketTermsOperationSchema,
  bucketFiltersOperationSchema,
  bucketHistogramOperationSchema,
  bucketRangesOperationSchema,
  bucketOperationDefinitionSchema,
} from './bucket_ops';
import {
  LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
  LENS_PERCENTILE_DEFAULT_VALUE,
  LENS_PERCENTILE_RANK_DEFAULT_VALUE,
  LENS_TERMS_LIMIT_DEFAULT,
} from './constants';

describe('Bucket Operation Schemas', () => {
  describe('dateHistogram operation', () => {
    it('validates a valid date histogram configuration', () => {
      const input = {
        operation: 'date_histogram',
        field: 'timestamp',
        suggested_interval: 'auto',
        include_empty_rows: true,
        use_original_time_range: true,
        drop_partial_intervals: false,
      };

      const validated = bucketDateHistogramOperationSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('requires operation and field', () => {
      const result = bucketDateHistogramOperationSchema.safeParse({
        operation: 'date_histogram',
      });
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at field"
      `);
    });
  });

  describe('terms operation', () => {
    it('validates a minimal terms configuration', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
      };
      const validated = bucketTermsOperationSchema.parse(input);
      expect(validated).toEqual({ ...input, limit: LENS_TERMS_LIMIT_DEFAULT });
    });

    it('validates a valid terms configuration', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
        limit: 10,
        increase_accuracy: true,
        includes: {
          values: ['value1', 'value2'],
          as_regex: true,
        },
        excludes: {
          values: ['value3'],
          as_regex: false,
        },
        other_bucket: {
          include_documents_without_field: true,
        },
        rank_by: {
          type: 'alphabetical' as const,
          direction: 'asc' as const,
        },
      };

      const validated = bucketTermsOperationSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates different rank_by types', () => {
      const inputs = [
        {
          type: 'rare' as const,
          max: 10,
        },
        {
          type: 'significant' as const,
        },
        {
          type: 'metric' as const,
          metric_index: 1,
          direction: 'desc' as const,
        },
        {
          type: 'custom' as const,
          operation: 'average' as const,
          field: 'myfield',
          direction: 'asc' as const,
        },
      ];

      inputs.forEach((rankBy) => {
        const input = {
          operation: 'terms',
          fields: ['category'],
          rank_by: rankBy,
        };

        const validated = bucketTermsOperationSchema.parse(input);
        expect(validated.rank_by).toEqual(rankBy);
      });
    });

    it('validates rank_by custom with percentile operation', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
        rank_by: {
          type: 'custom',
          operation: 'percentile',
          field: 'latency',
          direction: 'desc',
          percentile: 90,
        },
      };

      const validated = bucketTermsOperationSchema.parse(input);
      expect(validated.rank_by).toEqual(input.rank_by);
    });

    it('validates rank_by custom with percentile operation uses default', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
        rank_by: {
          type: 'custom',
          operation: 'percentile',
          field: 'latency',
          direction: 'desc',
        },
      };

      const validated = bucketTermsOperationSchema.parse(input);
      expect(validated.rank_by).toEqual({
        ...input.rank_by,
        percentile: LENS_PERCENTILE_DEFAULT_VALUE,
      });
    });

    it('validates rank_by custom with percentile_rank operation', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
        rank_by: {
          type: 'custom',
          operation: 'percentile_rank',
          field: 'latency',
          direction: 'asc',
          rank: 500,
        },
      };

      const validated = bucketTermsOperationSchema.parse(input);
      expect(validated.rank_by).toEqual(input.rank_by);
    });

    it('validates rank_by custom with percentile_rank operation uses default', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
        rank_by: {
          type: 'custom',
          operation: 'percentile_rank',
          field: 'latency',
          direction: 'asc',
        },
      };

      const validated = bucketTermsOperationSchema.parse(input);
      expect(validated.rank_by).toEqual({
        ...input.rank_by,
        rank: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
      });
    });

    it('validates rank_by custom count without a field', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
        rank_by: {
          type: 'custom',
          operation: 'count',
          direction: 'desc',
        },
      };

      const validated = bucketTermsOperationSchema.parse(input);
      expect(validated.rank_by).toEqual(input.rank_by);
    });

    it('validates rank_by custom count with a field', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
        rank_by: {
          type: 'custom',
          operation: 'count',
          field: 'bytes',
          direction: 'asc',
        },
      };

      const validated = bucketTermsOperationSchema.parse(input);
      expect(validated.rank_by).toEqual(input.rank_by);
    });

    it('rejects rank_by custom non-count operation without a field', () => {
      const operations = [
        'average',
        'median',
        'standard_deviation',
        'unique_count',
        'sum',
        'last_value',
      ];
      operations.forEach((operation) => {
        const input = {
          operation: 'terms',
          fields: ['category'],
          rank_by: {
            type: 'custom',
            operation,
            direction: 'desc',
          },
        };
        expect(() => bucketTermsOperationSchema.parse(input)).toThrow();
      });
    });
  });

  describe('filter operation', () => {
    it('validates a valid filter configuration', () => {
      const input = {
        operation: 'filters',
        filters: [
          {
            label: 'My Filter',
            filter: {
              language: 'kql',
              expression: 'category: "electronics"',
            },
          },
        ],
      };

      const validated = bucketFiltersOperationSchema.parse(input);
      expect(validated).toEqual(input);
    });
  });

  describe('histogram operation', () => {
    it('validates a valid histogram configuration', () => {
      const input = {
        operation: 'histogram',
        field: 'price',
      };

      const validated = bucketHistogramOperationSchema.parse(input);
      expect(validated).toEqual({
        ...input,
        granularity: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
        include_empty_rows: LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
      });
    });

    it('enforces granularity limits', () => {
      const result1 = bucketHistogramOperationSchema.safeParse({
        operation: 'histogram',
        field: 'price',
        granularity: 0,
      });
      expectPrettyError(result1).toMatchInlineSnapshot(`
        "✖ Too small: expected number to be >=1
          → at granularity"
      `);

      const result2 = bucketHistogramOperationSchema.safeParse({
        operation: 'histogram',
        field: 'price',
        granularity: 8,
      });
      expectPrettyError(result2).toMatchInlineSnapshot(`
        "✖ Too big: expected number to be <=7
          → at granularity"
      `);
    });
  });

  describe('ranges operation', () => {
    it('validates a valid ranges configuration', () => {
      const input = {
        operation: 'range',
        field: 'price',
        ranges: [
          { gt: 0, lte: 50, label: 'Low' },
          { gt: 50, lte: 100, label: 'Medium' },
          { gt: 100, label: 'High' },
        ],
      };

      const validated = bucketRangesOperationSchema.parse(input);
      expect(validated).toEqual(input);
    });
  });

  describe('bucketOperationDefinitionSchema', () => {
    it('validates all operation types', () => {
      const operations = [
        {
          operation: 'date_histogram',
          field: 'timestamp',
          suggested_interval: 'auto',
          include_empty_rows: true,
          use_original_time_range: true,
          drop_partial_intervals: false,
        },
        {
          operation: 'terms',
          fields: ['category'],
          limit: LENS_TERMS_LIMIT_DEFAULT,
        },
        {
          operation: 'histogram',
          field: 'price',
          granularity: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
          include_empty_rows: LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
        },
        {
          operation: 'range',
          field: 'price',
          ranges: [{ gt: 0, lte: 50 }],
        },
        {
          operation: 'filters',
          filters: [
            {
              label: 'Filter',
              filter: { language: 'kql', expression: 'status:active' },
            },
          ],
        },
      ];

      operations.forEach((op) => {
        const validated = bucketOperationDefinitionSchema.parse(op);
        expect(validated).toEqual(op);
      });
    });

    it('rejects invalid operation types', () => {
      const result = bucketOperationDefinitionSchema.safeParse({
        operation: 'invalid_operation',
        field: 'test',
      });
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });
  });
});
