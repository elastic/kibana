/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  LENS_TERMS_SIZE_DEFAULT,
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
      };

      const validated = bucketDateHistogramOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('requires operation and field', () => {
      expect(() =>
        bucketDateHistogramOperationSchema.validate({
          operation: 'date_histogram',
        })
      ).toThrow(/\[field\]: expected value of type/);
    });
  });

  describe('terms operation', () => {
    it('validates a minimal terms configuration', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
      };
      const validated = bucketTermsOperationSchema.validate(input);
      expect(validated).toEqual({ ...input, size: LENS_TERMS_SIZE_DEFAULT });
    });

    it('validates a valid terms configuration', () => {
      const input = {
        operation: 'terms',
        fields: ['category'],
        size: 10,
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

      const validated = bucketTermsOperationSchema.validate(input);
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
          type: 'column' as const,
          metric: 1,
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

        const validated = bucketTermsOperationSchema.validate(input);
        expect(validated.rank_by).toEqual(rankBy);
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
              language: 'kuery',
              query: 'category: "electronics"',
            },
          },
        ],
      };

      const validated = bucketFiltersOperationSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('histogram operation', () => {
    it('validates a valid histogram configuration', () => {
      const input = {
        operation: 'histogram',
        field: 'price',
      };

      const validated = bucketHistogramOperationSchema.validate(input);
      expect(validated).toEqual({
        ...input,
        granularity: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
        include_empty_rows: LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
      });
    });

    it('enforces granularity limits', () => {
      expect(() =>
        bucketHistogramOperationSchema.validate({
          operation: 'histogram',
          field: 'price',
          granularity: 0,
        })
      ).toThrow();

      expect(() =>
        bucketHistogramOperationSchema.validate({
          operation: 'histogram',
          field: 'price',
          granularity: 8,
        })
      ).toThrow();
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

      const validated = bucketRangesOperationSchema.validate(input);
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
        },
        {
          operation: 'terms',
          fields: ['category'],
          size: LENS_TERMS_SIZE_DEFAULT,
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
              filter: { language: 'kuery', query: 'status:active' },
            },
          ],
        },
      ];

      operations.forEach((op) => {
        const validated = bucketOperationDefinitionSchema.validate(op);
        expect(validated).toEqual(op);
      });
    });

    it('rejects invalid operation types', () => {
      expect(() =>
        bucketOperationDefinitionSchema.validate({
          operation: 'invalid_operation',
          field: 'test',
        })
      ).toThrow();
    });
  });
});
