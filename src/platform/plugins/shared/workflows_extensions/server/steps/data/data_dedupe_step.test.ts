/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OrStringRecursive } from '@kbn/utility-types';
import { dataDedupeStepDefinition } from './data_dedupe_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataDedupeStepDefinition', () => {
  const createMockContext = (input: {
    items: unknown[];
    keys: string[];
    strategy?: 'keep_first' | 'keep_last';
  }): StepHandlerContext<{
    items: unknown[];
    keys: string[];
    strategy: 'keep_first' | 'keep_last';
  }> => ({
    input: { ...input, strategy: input.strategy || 'keep_first' },
    rawInput: input as OrStringRecursive<{
      items: unknown[];
      keys: string[];
      strategy: 'keep_first' | 'keep_last';
    }>,
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
    stepId: 'test-dedupe-step',
    stepType: 'data.dedupe',
  });

  describe('single key deduplication', () => {
    it('should remove duplicates based on a single key with keep_first strategy', async () => {
      const input = {
        items: [
          { id: 1, email: 'user@example.com', name: 'Alice' },
          { id: 2, email: 'admin@example.com', name: 'Bob' },
          { id: 3, email: 'user@example.com', name: 'Charlie' },
        ],
        keys: ['email'],
        strategy: 'keep_first' as const,
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 1, email: 'user@example.com', name: 'Alice' },
        { id: 2, email: 'admin@example.com', name: 'Bob' },
      ]);
    });

    it('should remove duplicates based on a single key with keep_last strategy', async () => {
      const input = {
        items: [
          { id: 1, email: 'user@example.com', name: 'Alice' },
          { id: 2, email: 'admin@example.com', name: 'Bob' },
          { id: 3, email: 'user@example.com', name: 'Charlie' },
        ],
        keys: ['email'],
        strategy: 'keep_last' as const,
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 3, email: 'user@example.com', name: 'Charlie' },
        { id: 2, email: 'admin@example.com', name: 'Bob' },
      ]);
    });
  });

  describe('multiple key deduplication', () => {
    it('should remove duplicates based on multiple keys', async () => {
      const input = {
        items: [
          { user_id: 1, event_type: 'login', timestamp: '2024-01-01' },
          { user_id: 1, event_type: 'logout', timestamp: '2024-01-02' },
          { user_id: 1, event_type: 'login', timestamp: '2024-01-03' },
          { user_id: 2, event_type: 'login', timestamp: '2024-01-04' },
        ],
        keys: ['user_id', 'event_type'],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.output).toHaveLength(3);
      expect(result.output).toEqual([
        { user_id: 1, event_type: 'login', timestamp: '2024-01-01' },
        { user_id: 1, event_type: 'logout', timestamp: '2024-01-02' },
        { user_id: 2, event_type: 'login', timestamp: '2024-01-04' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', async () => {
      const input = {
        items: [],
        keys: ['email'],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.output).toEqual([]);
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Input array is empty, returning empty array'
      );
    });

    it('should handle array with no duplicates', async () => {
      const input = {
        items: [
          { id: 1, email: 'alice@example.com' },
          { id: 2, email: 'bob@example.com' },
          { id: 3, email: 'charlie@example.com' },
        ],
        keys: ['email'],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.output).toHaveLength(3);
      expect(result.output).toEqual(input.items);
    });

    it('should handle items with missing keys', async () => {
      const input = {
        items: [
          { id: 1, email: 'user@example.com' },
          { id: 2 },
          { id: 3, email: 'user@example.com' },
          { id: 4 },
        ],
        keys: ['email'],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      // Items with missing keys (undefined) are treated as duplicates
      expect(result.output).toHaveLength(2);
      expect(result.output).toContainEqual({ id: 1, email: 'user@example.com' });
      expect(result.output).toContainEqual({ id: 2 }); // First item with undefined email
    });

    it('should handle null and undefined values in keys', async () => {
      const input = {
        items: [
          { id: 1, status: null },
          { id: 2, status: undefined },
          { id: 3, status: null },
          { id: 4, status: 'active' },
        ],
        keys: ['status'],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.output).toHaveLength(3);
    });

    it('should handle complex nested objects in values', async () => {
      const input = {
        items: [
          { id: 1, user: { name: 'Alice', age: 30 } },
          { id: 2, user: { name: 'Bob', age: 25 } },
          { id: 3, user: { name: 'Alice', age: 30 } },
        ],
        keys: ['user'],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.output).toHaveLength(2);
      expect(result.output).toContainEqual({ id: 1, user: { name: 'Alice', age: 30 } });
      expect(result.output).toContainEqual({ id: 2, user: { name: 'Bob', age: 25 } });
    });
  });

  describe('error handling', () => {
    it('should return error when items is not an array', async () => {
      const input = {
        items: 'not-an-array' as unknown as unknown[],
        keys: ['email'],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected items to be an array');
      expect(context.logger.error).toHaveBeenCalledWith('Input items is not an array');
    });

    it('should return error when keys is empty', async () => {
      const input = {
        items: [{ id: 1 }],
        keys: [],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Keys must be a non-empty array');
    });

    it('should return error when keys is not an array', async () => {
      const input = {
        items: [{ id: 1 }],
        keys: 'email' as unknown as string[],
      };

      const context = createMockContext(input);
      const result = await dataDedupeStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Keys must be a non-empty array');
    });
  });

  describe('logging', () => {
    it('should log deduplication statistics', async () => {
      const input = {
        items: [
          { id: 1, email: 'user@example.com' },
          { id: 2, email: 'admin@example.com' },
          { id: 3, email: 'user@example.com' },
          { id: 4, email: 'user@example.com' },
        ],
        keys: ['email'],
      };

      const context = createMockContext(input);
      await dataDedupeStepDefinition.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Deduplicating 4 items using keys: email')
      );
      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('2 unique items, 2 duplicates removed')
      );
    });
  });
});
