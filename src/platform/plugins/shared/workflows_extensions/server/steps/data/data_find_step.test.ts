/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OrStringRecursive } from '@kbn/utility-types';
import { dataFindStepDefinition } from './data_find_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataFindStepDefinition', () => {
  const createMockContext = (
    config: {
      items: unknown[];
      detailed?: boolean;
    },
    input: {
      condition: string;
      errorIfEmpty?: boolean;
    }
  ): StepHandlerContext<any, any> => ({
    config,
    input,
    rawInput: input as OrStringRecursive<{ condition: string; errorIfEmpty?: boolean }>,
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
    stepId: 'test-find-step',
    stepType: 'data.find',
  });

  describe('basic finding', () => {
    it('should find first matching item based on KQL condition', async () => {
      const config = {
        items: [
          { status: 'inactive', id: 1 },
          { status: 'active', id: 2 },
          { status: 'active', id: 3 },
        ],
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({ status: 'active', id: 2 });
    });

    it('should find first item matching complex KQL condition', async () => {
      const config = {
        items: [
          { status: 'active', severity: 1 },
          { status: 'active', severity: 3 },
          { status: 'active', severity: 5 },
        ],
      };
      const input = {
        condition: 'item.status: active AND item.severity > 2',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({ status: 'active', severity: 3 });
    });

    it('should return null when no items match', async () => {
      const config = {
        items: [
          { status: 'active', severity: 1 },
          { status: 'active', severity: 2 },
        ],
      };
      const input = {
        condition: 'item.severity > 5',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toBeNull();
    });
  });

  describe('errorIfEmpty handling', () => {
    it('should return error when no match found and errorIfEmpty is true', async () => {
      const config = {
        items: [{ status: 'inactive' }],
      };
      const input = {
        condition: 'item.status: active',
        errorIfEmpty: true,
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('No item matching the condition was found');
    });

    it('should return null when no match found and errorIfEmpty is false', async () => {
      const config = {
        items: [{ status: 'inactive' }],
      };
      const input = {
        condition: 'item.status: active',
        errorIfEmpty: false,
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should return null by default when no match found', async () => {
      const config = {
        items: [{ status: 'inactive' }],
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toBeNull();
      expect(result.error).toBeUndefined();
    });
  });

  describe('detailed mode', () => {
    it('should return metadata when detailed is true and item found', async () => {
      const config = {
        items: [
          { status: 'inactive', id: 1 },
          { status: 'active', id: 2 },
          { status: 'active', id: 3 },
        ],
        detailed: true,
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({
        item: { status: 'active', id: 2 },
        metadata: {
          matchIndex: 1,
        },
      });
    });

    it('should return metadata with null when detailed is true and no item found', async () => {
      const config = {
        items: [{ status: 'inactive' }],
        detailed: true,
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({
        item: null,
        metadata: {
          matchIndex: null,
        },
      });
    });

    it('should return just item when detailed is false', async () => {
      const config = {
        items: [{ status: 'active', id: 1 }],
        detailed: false,
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({ status: 'active', id: 1 });
    });
  });

  describe('empty condition handling', () => {
    it('should return first item when condition is empty', async () => {
      const config = {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      const input = {
        condition: '',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({ id: 1 });
    });

    it('should return null when condition is empty and items array is empty', async () => {
      const config = {
        items: [],
      };
      const input = {
        condition: '',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toBeNull();
    });

    it('should return error when condition is empty, items array is empty, and errorIfEmpty is true', async () => {
      const config = {
        items: [],
      };
      const input = {
        condition: '',
        errorIfEmpty: true,
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('No items found');
    });
  });

  describe('error handling', () => {
    it('should return error for invalid KQL syntax', async () => {
      const config = {
        items: [{ status: 'active' }],
      };
      const input = {
        condition: 'invalid ( unclosed',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid KQL condition');
    });

    it('should return error for non-array items', async () => {
      const config = {
        items: { status: 'active' } as any,
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected items to be an array');
    });

    it('should continue searching even if one item evaluation fails', async () => {
      const config = {
        items: [null, { status: 'active', id: 2 }],
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({ status: 'active', id: 2 });
      expect(context.logger.warn).toHaveBeenCalled();
    });
  });

  describe('index access in KQL', () => {
    it('should support index in KQL condition', async () => {
      const config = {
        items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
      };
      const input = {
        condition: 'index >= 2',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({ value: 'c' });
    });
  });

  describe('abort signal', () => {
    it('should respect abort signal', async () => {
      const abortController = new AbortController();
      const config = {
        items: [{ id: 1 }, { id: 2 }],
      };
      const input = {
        condition: 'item.id > 0',
      };

      const context = createMockContext(config, input);
      context.abortSignal = abortController.signal;

      // Abort immediately
      abortController.abort();

      const result = await dataFindStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('aborted');
    });
  });

  describe('performance - early exit', () => {
    it('should stop searching after finding first match', async () => {
      const config = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          status: i === 5 ? 'active' : 'inactive',
        })),
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFindStepDefinition.handler(context);

      expect(result.output).toEqual({ id: 5, status: 'active' });
      // Should have logged finding at index 5, not processed all 1000 items
      expect(context.logger.debug).toHaveBeenCalledWith('Found match at index 5');
    });
  });
});
