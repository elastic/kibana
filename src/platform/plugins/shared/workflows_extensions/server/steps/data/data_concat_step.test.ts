/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataConcatStepDefinition, MAX_CONCAT_ITEMS } from './data_concat_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataConcatStepDefinition', () => {
  const createMockContext = (
    config: { arrays: unknown[] },
    input: { dedupe?: boolean; flatten?: boolean | number } = {}
  ): StepHandlerContext<any, any> => ({
    config,
    input: { dedupe: input.dedupe ?? false, flatten: input.flatten ?? false },
    rawInput: input as any,
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
    stepId: 'test-concat-step',
    stepType: 'data.concat',
  });

  describe('basic concatenation', () => {
    it('should concatenate two arrays', async () => {
      const context = createMockContext({
        arrays: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should concatenate three arrays', async () => {
      const context = createMockContext({
        arrays: [['a', 'b'], ['c'], ['d', 'e']],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('should preserve object types', async () => {
      const context = createMockContext({
        arrays: [[{ id: 1, name: 'Alice' }], [{ id: 2, name: 'Bob' }]],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should preserve mixed types', async () => {
      const context = createMockContext({
        arrays: [[1, 'two'], [true, null], [{ key: 'val' }]],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 'two', true, null, { key: 'val' }]);
    });
  });

  describe('empty array handling', () => {
    it('should handle empty arrays in input', async () => {
      const context = createMockContext({
        arrays: [[1, 2], [], [3]],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2, 3]);
    });

    it('should handle all empty arrays', async () => {
      const context = createMockContext({
        arrays: [[], [], []],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([]);
    });

    it('should treat null entries as empty arrays', async () => {
      const context = createMockContext({
        arrays: [[1, 2], null, [3]],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2, 3]);
    });

    it('should treat undefined entries as empty arrays', async () => {
      const context = createMockContext({
        arrays: [[1], undefined, [2]],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2]);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate primitive values', async () => {
      const context = createMockContext(
        {
          arrays: [
            [1, 2, 3],
            [2, 3, 4],
          ],
        },
        { dedupe: true }
      );
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2, 3, 4]);
    });

    it('should deduplicate string values', async () => {
      const context = createMockContext(
        {
          arrays: [
            ['a@test.com', 'b@test.com'],
            ['b@test.com', 'c@test.com'],
          ],
        },
        { dedupe: true }
      );
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual(['a@test.com', 'b@test.com', 'c@test.com']);
    });

    it('should deduplicate objects by value equality', async () => {
      const context = createMockContext(
        {
          arrays: [
            [{ id: 1, name: 'Alice' }],
            [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
            ],
          ],
        },
        { dedupe: true }
      );
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should keep first occurrence when deduplicating', async () => {
      const context = createMockContext(
        {
          arrays: [
            ['first', 'dup'],
            ['dup', 'last'],
          ],
        },
        { dedupe: true }
      );
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual(['first', 'dup', 'last']);
    });

    it('should not deduplicate when dedupe is false', async () => {
      const context = createMockContext(
        {
          arrays: [
            [1, 2],
            [2, 3],
          ],
        },
        { dedupe: false }
      );
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2, 2, 3]);
    });
  });

  describe('flattening', () => {
    it('should flatten nested arrays one level when flatten is true', async () => {
      const context = createMockContext(
        { arrays: [[['a', 'b'], ['c']], [['d']]] },
        { flatten: true }
      );
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should flatten to specified numeric depth', async () => {
      const context = createMockContext({ arrays: [[[1, [2, [3]]]]] }, { flatten: 2 });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2, [3]]);
    });

    it('should not flatten when flatten is false', async () => {
      const context = createMockContext({ arrays: [[['a', 'b'], 'c']] }, { flatten: false });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([['a', 'b'], 'c']);
    });
  });

  describe('combined options', () => {
    it('should flatten then deduplicate', async () => {
      const context = createMockContext(
        {
          arrays: [
            [
              [1, 2],
              [2, 3],
            ],
            [[3, 4]],
          ],
        },
        { flatten: true, dedupe: true }
      );
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2, 3, 4]);
    });
  });

  describe('error handling', () => {
    it('should return error when arrays is empty', async () => {
      const context = createMockContext({ arrays: [] });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('non-empty');
    });

    it('should return error when an entry is not an array', async () => {
      const context = createMockContext({
        arrays: [[1, 2], 'not-an-array' as unknown],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('not an array');
    });

    it('should return error when an entry is a number', async () => {
      const context = createMockContext({
        arrays: [[1, 2], 42 as unknown],
      });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('not an array');
    });

    it('should return error when concatenated result exceeds max items', async () => {
      const bigArray = Array.from({ length: MAX_CONCAT_ITEMS + 1 }, (_, i) => i);
      const context = createMockContext({ arrays: [bigArray] });
      const result = await dataConcatStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain(`maximum of ${MAX_CONCAT_ITEMS}`);
    });
  });

  describe('logging', () => {
    it('should log concatenation details', async () => {
      const context = createMockContext({
        arrays: [[1, 2], [3]],
      });
      await dataConcatStepDefinition.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        'Concatenated 2 arrays into 3 items (flatten: false, dedupe: false)'
      );
    });
  });
});
