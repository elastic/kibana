/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataAggregateStepDefinition } from './data_aggregate_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataAggregateStepDefinition', () => {
  const createMockContext = (
    config: { items: unknown },
    input: {
      group_by: string[];
      metrics: Array<{ name: string; operation: string; field?: string }>;
      buckets?: { field: string; ranges: Array<{ from?: number; to?: number; label?: string }> };
      order_by?: string;
      order?: 'asc' | 'desc';
      limit?: number;
    }
  ): StepHandlerContext<
    typeof dataAggregateStepDefinition.inputSchema,
    typeof dataAggregateStepDefinition.configSchema
  > => ({
    config: config as any,
    input: input as any,
    rawInput: input as any,
    contextManager: {
      renderInputTemplate: jest.fn((val) => val),
      getContext: jest.fn(),
      getScopedEsClient: jest.fn(),
      getFakeRequest: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-aggregate',
    stepType: 'data.aggregate',
  });

  const tickets = [
    { status: 'open', severity: 3, age_days: 5 },
    { status: 'open', severity: 1, age_days: 10 },
    { status: 'closed', severity: 2, age_days: 2 },
    { status: 'closed', severity: 4, age_days: 8 },
    { status: 'closed', severity: 1, age_days: 1 },
  ];

  describe('basic grouping', () => {
    it('should group by a single key with count', async () => {
      const context = createMockContext(
        { items: tickets },
        {
          group_by: ['status'],
          metrics: [{ name: 'count', operation: 'count' }],
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect(output).toHaveLength(2);

      const open = output.find((r) => r.status === 'open');
      const closed = output.find((r) => r.status === 'closed');

      expect(open?.count).toBe(2);
      expect(closed?.count).toBe(3);
    });

    it('should compute multiple metrics per group', async () => {
      const context = createMockContext(
        { items: tickets },
        {
          group_by: ['status'],
          metrics: [
            { name: 'count', operation: 'count' },
            { name: 'avg_age', operation: 'avg', field: 'age_days' },
            { name: 'max_sev', operation: 'max', field: 'severity' },
            { name: 'min_sev', operation: 'min', field: 'severity' },
            { name: 'total_age', operation: 'sum', field: 'age_days' },
          ],
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;
      const open = output.find((r) => r.status === 'open')!;

      expect(open.count).toBe(2);
      expect(open.avg_age).toBe(7.5);
      expect(open.max_sev).toBe(3);
      expect(open.min_sev).toBe(1);
      expect(open.total_age).toBe(15);
    });

    it('should group by multiple keys', async () => {
      const items = [
        { dept: 'eng', level: 'junior', salary: 50 },
        { dept: 'eng', level: 'senior', salary: 100 },
        { dept: 'eng', level: 'junior', salary: 60 },
        { dept: 'sales', level: 'junior', salary: 40 },
      ];

      const context = createMockContext(
        { items },
        {
          group_by: ['dept', 'level'],
          metrics: [
            { name: 'count', operation: 'count' },
            { name: 'avg_salary', operation: 'avg', field: 'salary' },
          ],
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect(output).toHaveLength(3);

      const engJunior = output.find((r) => r.dept === 'eng' && r.level === 'junior');
      expect(engJunior?.count).toBe(2);
      expect(engJunior?.avg_salary).toBe(55);
    });
  });

  describe('bucketed aggregation', () => {
    it('should group items into buckets', async () => {
      const users = [
        { dept: 'eng', age: 25, salary: 50 },
        { dept: 'eng', age: 35, salary: 80 },
        { dept: 'eng', age: 55, salary: 120 },
        { dept: 'sales', age: 28, salary: 40 },
      ];

      const context = createMockContext(
        { items: users },
        {
          group_by: ['dept'],
          metrics: [{ name: 'count', operation: 'count' }],
          buckets: {
            field: 'age',
            ranges: [
              { to: 30, label: 'junior' },
              { from: 30, to: 50, label: 'mid' },
              { from: 50, label: 'senior' },
            ],
          },
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect(output.length).toBeGreaterThanOrEqual(3);
      const engJunior = output.find((r) => r.dept === 'eng' && r._bucket === 'junior');
      expect(engJunior?.count).toBe(1);
    });

    it('should skip items that do not fall into any bucket', async () => {
      const items = [
        { type: 'a', score: 25 },
        { type: 'a', score: 'not-a-number' },
      ];

      const context = createMockContext(
        { items },
        {
          group_by: ['type'],
          metrics: [{ name: 'count', operation: 'count' }],
          buckets: {
            field: 'score',
            ranges: [{ from: 0, to: 100, label: 'normal' }],
          },
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect(output).toHaveLength(1);
      expect(output[0].count).toBe(1);
    });
  });

  describe('ordering and limiting', () => {
    it('should order results ascending by default', async () => {
      const context = createMockContext(
        { items: tickets },
        {
          group_by: ['status'],
          metrics: [{ name: 'count', operation: 'count' }],
          order_by: 'count',
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect((output[0] as any).count).toBeLessThanOrEqual((output[1] as any).count);
    });

    it('should order results descending', async () => {
      const context = createMockContext(
        { items: tickets },
        {
          group_by: ['status'],
          metrics: [{ name: 'count', operation: 'count' }],
          order_by: 'count',
          order: 'desc',
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect((output[0] as any).count).toBeGreaterThanOrEqual((output[1] as any).count);
    });

    it('should limit results', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ group: `g${i}`, value: i }));

      const context = createMockContext(
        { items },
        {
          group_by: ['group'],
          metrics: [{ name: 'count', operation: 'count' }],
          limit: 5,
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect(output).toHaveLength(5);
    });

    it('should order then limit', async () => {
      const items = [
        { status: 'a', val: 1 },
        { status: 'a', val: 2 },
        { status: 'b', val: 3 },
        { status: 'c', val: 4 },
        { status: 'c', val: 5 },
        { status: 'c', val: 6 },
      ];

      const context = createMockContext(
        { items },
        {
          group_by: ['status'],
          metrics: [{ name: 'count', operation: 'count' }],
          order_by: 'count',
          order: 'desc',
          limit: 2,
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect(output).toHaveLength(2);
      expect(output[0].status).toBe('c');
      expect(output[0].count).toBe(3);
      expect(output[1].status).toBe('a');
      expect(output[1].count).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should return error for non-array items', async () => {
      const context = createMockContext(
        { items: 'not-an-array' },
        {
          group_by: ['key'],
          metrics: [{ name: 'count', operation: 'count' }],
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected items to be an array');
    });

    it('should return empty array for empty input', async () => {
      const context = createMockContext(
        { items: [] },
        {
          group_by: ['key'],
          metrics: [{ name: 'count', operation: 'count' }],
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      expect(result.output).toEqual([]);
    });

    it('should return error when non-count metric has no field', async () => {
      const context = createMockContext(
        { items: [{ a: 1 }] },
        {
          group_by: ['a'],
          metrics: [{ name: 'total', operation: 'sum' }],
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('no field was provided');
    });

    it('should return null for metrics on non-numeric fields', async () => {
      const context = createMockContext(
        { items: [{ type: 'a', name: 'hello' }] },
        {
          group_by: ['type'],
          metrics: [{ name: 'avg_name', operation: 'avg', field: 'name' }],
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      const output = result.output as Array<Record<string, unknown>>;

      expect(output[0].avg_name).toBeNull();
    });

    it('should return error when items exceed MAX_AGGREGATE_ITEMS', async () => {
      const largeItems = Array.from({ length: 100_001 }, (_, i) => ({ key: i }));
      const context = createMockContext(
        { items: largeItems },
        {
          group_by: ['key'],
          metrics: [{ name: 'count', operation: 'count' }],
        }
      );

      const result = await dataAggregateStepDefinition.handler(context);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('exceeding the maximum');
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(dataAggregateStepDefinition.id).toBe('data.aggregate');
    });
  });
});
