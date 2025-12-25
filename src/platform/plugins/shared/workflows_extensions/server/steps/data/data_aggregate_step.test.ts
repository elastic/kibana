/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OrStringRecursive } from '@kbn/utility-types';
import { dataAggregateStepDefinition } from './data_aggregate_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataAggregateStepDefinition', () => {
  const createMockContext = (
    config: {
      items: unknown[];
    },
    input: {
      group_by: string | string[];
      metrics: Record<string, { type: 'sum' | 'avg' | 'min' | 'max' | 'count'; field: string }>;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      limit?: number;
    }
  ): StepHandlerContext<any, any> => ({
    config,
    input: { ...input, sort_order: input.sort_order || 'asc' },
    rawInput: input as OrStringRecursive<any>,
    contextManager: {
      getContext: jest.fn(),
      getFakeRequest: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn((val) => val),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-aggregate-step',
    stepType: 'data.aggregate',
  });

  describe('single key grouping', () => {
    it('should group by single key with count metric', async () => {
      const config = {
        items: [
          { status: 'open', priority: 1 },
          { status: 'closed', priority: 2 },
          { status: 'open', priority: 3 },
          { status: 'open', priority: 1 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toHaveLength(2);
      expect(result.output).toEqual(
        expect.arrayContaining([
          { status: 'open', count: 3 },
          { status: 'closed', count: 1 },
        ])
      );
    });

    it('should compute multiple metrics per group', async () => {
      const config = {
        items: [
          { status: 'open', age_days: 5, severity: 1 },
          { status: 'open', age_days: 3, severity: 2 },
          { status: 'closed', age_days: 10, severity: 3 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
          avg_age: { type: 'avg' as const, field: 'age_days' },
          max_sev: { type: 'max' as const, field: 'severity' },
          min_age: { type: 'min' as const, field: 'age_days' },
          total_age: { type: 'sum' as const, field: 'age_days' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toHaveLength(2);
      expect(result.output).toEqual(
        expect.arrayContaining([
          { status: 'open', count: 2, avg_age: 4, max_sev: 2, min_age: 3, total_age: 8 },
          { status: 'closed', count: 1, avg_age: 10, max_sev: 3, min_age: 10, total_age: 10 },
        ])
      );
    });
  });

  describe('multiple key grouping', () => {
    it('should group by multiple keys', async () => {
      const config = {
        items: [
          { user_id: 1, event_type: 'login', duration: 100 },
          { user_id: 1, event_type: 'logout', duration: 50 },
          { user_id: 1, event_type: 'login', duration: 120 },
          { user_id: 2, event_type: 'login', duration: 80 },
        ],
      };
      const input = {
        group_by: ['user_id', 'event_type'],
        metrics: {
          count: { type: 'count' as const, field: '' },
          avg_duration: { type: 'avg' as const, field: 'duration' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toHaveLength(3);
      expect(result.output).toEqual(
        expect.arrayContaining([
          { user_id: 1, event_type: 'login', count: 2, avg_duration: 110 },
          { user_id: 1, event_type: 'logout', count: 1, avg_duration: 50 },
          { user_id: 2, event_type: 'login', count: 1, avg_duration: 80 },
        ])
      );
    });
  });

  describe('sorting and limiting', () => {
    it('should sort results in ascending order', async () => {
      const config = {
        items: [
          { category: 'A', value: 30 },
          { category: 'B', value: 10 },
          { category: 'C', value: 20 },
        ],
      };
      const input = {
        group_by: 'category',
        metrics: {
          total: { type: 'sum' as const, field: 'value' },
        },
        sort_by: 'total',
        sort_order: 'asc' as const,
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toEqual([
        { category: 'B', total: 10 },
        { category: 'C', total: 20 },
        { category: 'A', total: 30 },
      ]);
    });

    it('should sort results in descending order', async () => {
      const config = {
        items: [
          { status: 'open', count_val: 5 },
          { status: 'closed', count_val: 15 },
          { status: 'pending', count_val: 10 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
        sort_by: 'count',
        sort_order: 'desc' as const,
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toEqual([
        { status: 'open', count: 1 },
        { status: 'closed', count: 1 },
        { status: 'pending', count: 1 },
      ]);
    });

    it('should sort by group key', async () => {
      const config = {
        items: [
          { category: 'Z', value: 1 },
          { category: 'A', value: 2 },
          { category: 'M', value: 3 },
        ],
      };
      const input = {
        group_by: 'category',
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
        sort_by: 'category',
        sort_order: 'asc' as const,
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toEqual([
        { category: 'A', count: 1 },
        { category: 'M', count: 1 },
        { category: 'Z', count: 1 },
      ]);
    });

    it('should limit results', async () => {
      const config = {
        items: [
          { status: 'open', value: 10 },
          { status: 'closed', value: 20 },
          { status: 'pending', value: 30 },
          { status: 'archived', value: 40 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          total: { type: 'sum' as const, field: 'value' },
        },
        sort_by: 'total',
        sort_order: 'desc' as const,
        limit: 2,
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toHaveLength(2);
      expect(result.output).toEqual([
        { status: 'archived', total: 40 },
        { status: 'pending', total: 30 },
      ]);
    });
  });

  describe('null and undefined handling', () => {
    it('should create separate group for null values', async () => {
      const config = {
        items: [
          { status: 'open', value: 1 },
          { status: null, value: 2 },
          { status: 'open', value: 3 },
          { status: null, value: 4 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
          total: { type: 'sum' as const, field: 'value' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toHaveLength(2);
      expect(result.output).toEqual(
        expect.arrayContaining([
          { status: 'open', count: 2, total: 4 },
          { status: null, count: 2, total: 6 },
        ])
      );
    });

    it('should create separate group for undefined values', async () => {
      const config = {
        items: [{ status: 'open', value: 1 }, { value: 2 }, { status: 'open', value: 3 }],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toHaveLength(2);
      expect(result.output).toEqual(
        expect.arrayContaining([
          { status: 'open', count: 2 },
          { status: null, count: 1 },
        ])
      );
    });

    it('should handle null values in metric fields', async () => {
      const config = {
        items: [
          { status: 'open', value: 10 },
          { status: 'open', value: null },
          { status: 'open', value: 20 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
          avg_value: { type: 'avg' as const, field: 'value' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toEqual([{ status: 'open', count: 3, avg_value: 15 }]);
    });

    it('should return null for metrics with no valid values', async () => {
      const config = {
        items: [
          { status: 'open', value: null },
          { status: 'open', value: undefined },
          { status: 'open' },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
          avg_value: { type: 'avg' as const, field: 'value' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toEqual([{ status: 'open', count: 3, avg_value: null }]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', async () => {
      const config = {
        items: [],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toEqual([]);
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Input array is empty, returning empty array'
      );
    });

    it('should handle non-numeric values for numeric aggregations', async () => {
      const config = {
        items: [
          { status: 'open', value: 10 },
          { status: 'open', value: 'not-a-number' },
          { status: 'open', value: 20 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          total: { type: 'sum' as const, field: 'value' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toEqual([{ status: 'open', total: 30 }]);
    });

    it('should handle NaN values for numeric aggregations', async () => {
      const config = {
        items: [
          { status: 'open', value: 10 },
          { status: 'open', value: NaN },
          { status: 'open', value: 20 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          total: { type: 'sum' as const, field: 'value' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toEqual([{ status: 'open', total: 30 }]);
    });

    it('should handle items that are not objects', async () => {
      const config = {
        items: ['string1', 'string2', 'string1'],
      };
      const input = {
        group_by: 'field',
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.output).toHaveLength(1);
      expect(result.output![0]).toHaveProperty('count', 3);
    });
  });

  describe('error handling', () => {
    it('should return error when items is not an array', async () => {
      const config = {
        items: 'not-an-array' as unknown as unknown[],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected items to be an array');
      expect(context.logger.error).toHaveBeenCalledWith('Input items is not an array');
    });

    it('should return error when group_by is empty array', async () => {
      const config = {
        items: [{ status: 'open' }],
      };
      const input = {
        group_by: [] as unknown as string,
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('group_by must be a non-empty');
    });

    it('should return error when metrics is empty', async () => {
      const config = {
        items: [{ status: 'open' }],
      };
      const input = {
        group_by: 'status',
        metrics: {},
      };

      const context = createMockContext(config, input);
      const result = await dataAggregateStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('metrics must be a non-empty object');
    });
  });

  describe('logging', () => {
    it('should log aggregation statistics', async () => {
      const config = {
        items: [
          { status: 'open', value: 1 },
          { status: 'closed', value: 2 },
          { status: 'open', value: 3 },
        ],
      };
      const input = {
        group_by: 'status',
        metrics: {
          count: { type: 'count' as const, field: '' },
        },
      };

      const context = createMockContext(config, input);
      await dataAggregateStepDefinition.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Aggregating 3 items by [status] with 1 metrics')
      );
      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Created 2 unique groups')
      );
      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Aggregation complete: 2 groups returned')
      );
    });
  });
});
