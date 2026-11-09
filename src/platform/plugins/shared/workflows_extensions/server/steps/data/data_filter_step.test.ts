/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encodeKqlTemplateValue } from '@kbn/eval-kql';
import type { OrStringRecursive } from '@kbn/utility-types';
import { dataFilterStepDefinition } from './data_filter_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataFilterStepDefinition', () => {
  const createMockContext = (
    config: {
      items: unknown[];
    },
    input: {
      condition: string;
      limit?: number;
    }
  ): StepHandlerContext<any, any> => ({
    config,
    input,
    rawInput: input as OrStringRecursive<{ condition: string; limit?: number }>,
    contextManager: {
      getContext: jest.fn(),
      getFakeRequest: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn((val) => val),
      renderKqlConditionTemplate: jest.fn((val) => val),
      callKibanaApi: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-filter-step',
    stepType: 'data.filter',
  });

  describe('basic filtering', () => {
    it('should filter items based on KQL condition', async () => {
      const config = {
        items: [
          { status: 'active', severity: 3 },
          { status: 'inactive', severity: 1 },
          { status: 'active', severity: 5 },
        ],
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([
        { status: 'active', severity: 3 },
        { status: 'active', severity: 5 },
      ]);
    });

    it('should filter items with complex KQL condition', async () => {
      const config = {
        items: [
          { status: 'active', severity: 3 },
          { status: 'active', severity: 1 },
          { status: 'inactive', severity: 5 },
        ],
      };
      const input = {
        condition: 'item.status: active AND item.severity > 2',
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([{ status: 'active', severity: 3 }]);
    });

    it('should return empty array when no items match', async () => {
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
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([]);
    });

    it('should always return a plain array', async () => {
      const config = {
        items: [
          { status: 'active', id: 1 },
          { status: 'inactive', id: 2 },
        ],
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(Array.isArray(result.output)).toBe(true);
      expect(result.output).toEqual([{ status: 'active', id: 1 }]);
    });
  });

  describe('limit parameter', () => {
    it('should respect limit parameter', async () => {
      const config = {
        items: [
          { status: 'active', id: 1 },
          { status: 'active', id: 2 },
          { status: 'active', id: 3 },
          { status: 'active', id: 4 },
        ],
      };
      const input = {
        condition: 'item.status: active',
        limit: 2,
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([
        { status: 'active', id: 1 },
        { status: 'active', id: 2 },
      ]);
    });

    it('should return all matches if limit is greater than matched items', async () => {
      const config = {
        items: [
          { status: 'active', id: 1 },
          { status: 'active', id: 2 },
        ],
      };
      const input = {
        condition: 'item.status: active',
        limit: 10,
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([
        { status: 'active', id: 1 },
        { status: 'active', id: 2 },
      ]);
    });
  });

  describe('empty condition handling', () => {
    it('should return all items when condition is empty', async () => {
      const config = {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      const input = {
        condition: '',
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should return all items when condition is whitespace', async () => {
      const config = {
        items: [{ id: 1 }, { id: 2 }],
      };
      const input = {
        condition: '   ',
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should return empty array when condition is empty and items array is empty', async () => {
      const config = {
        items: [],
      };
      const input = {
        condition: '',
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([]);
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
      const result = await dataFilterStepDefinition.handler(context);

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
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected items to be an array');
    });

    it('should skip non-object items with a warning and keep filtering', async () => {
      const config = {
        items: [{ status: 'active', id: 1 }, null, { status: 'active', id: 3 }],
      };
      const input = {
        condition: 'item.status: active',
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      // A `null` item cannot satisfy an `item.<field>` condition; it is skipped
      // with a warning and excluded from the filtered output.
      expect(result.output).toEqual([
        { status: 'active', id: 1 },
        { status: 'active', id: 3 },
      ]);
      expect(context.logger.warn).toHaveBeenCalled();
    });
  });

  describe('index access in KQL', () => {
    it('should support index in KQL condition', async () => {
      const config = {
        items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }],
      };
      const input = {
        condition: 'index >= 2',
      };

      const context = createMockContext(config, input);
      const result = await dataFilterStepDefinition.handler(context);

      expect(result.output).toEqual([{ value: 'c' }, { value: 'd' }]);
    });
  });

  describe('abort signal', () => {
    it('should respect abort signal', async () => {
      const abortController = new AbortController();
      const config = {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      const input = {
        condition: 'item.id > 0',
      };

      const context = createMockContext(config, input);
      context.abortSignal = abortController.signal;

      abortController.abort();

      const result = await dataFilterStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('aborted');
    });
  });

  describe('templated values in the condition', () => {
    const items = [{ owner: 'a' }, { owner: 'b' }, { owner: 'a or item.owner: b' }];
    const injected = 'a or item.owner: b';

    it('matches interpolated values as literals', async () => {
      const context = createMockContext({ items }, { condition: `item.owner: ${injected}` });
      context.rawInput = { condition: 'item.owner: {{ inputs.owner }}' };
      (context.contextManager.renderKqlConditionTemplate as jest.Mock).mockReturnValue(
        `item.owner: ${encodeKqlTemplateValue(injected)}`
      );

      const result = await dataFilterStepDefinition.handler(context);

      expect(context.contextManager.renderKqlConditionTemplate).toHaveBeenCalledWith(
        'item.owner: {{ inputs.owner }}'
      );
      expect(result.output).toEqual([{ owner: injected }]);
    });

    it('fails instead of using the generically rendered condition when the engine cannot render it', async () => {
      const context = createMockContext({ items }, { condition: `item.owner: ${injected}` });
      context.contextManager.renderKqlConditionTemplate = undefined;

      const result = await dataFilterStepDefinition.handler(context);

      expect(result.error?.message).toContain('cannot safely render KQL conditions');
    });

    it('fails the step, instead of returning no items, when a value carries the wildcard marker', async () => {
      const context = createMockContext(
        { items },
        { condition: 'item.owner: {{ inputs.owner }}*' }
      );
      (context.contextManager.renderKqlConditionTemplate as jest.Mock).mockReturnValue(
        `item.owner: ${encodeKqlTemplateValue('@kuery-wildcard@')}*`
      );

      const result = await dataFilterStepDefinition.handler(context);

      expect(result.error?.message).toContain('wildcards');
      expect(result.output).toBeUndefined();
      expect(context.logger.warn).not.toHaveBeenCalled();
    });

    it('shows the interpolated value, not its internal token, in a syntax error', async () => {
      const context = createMockContext({ items }, { condition: 'item.owner: {{ inputs.owner }}' });
      (context.contextManager.renderKqlConditionTemplate as jest.Mock).mockReturnValue(
        `item.owner: ${encodeKqlTemplateValue('hello world')} owner: x`
      );

      const result = await dataFilterStepDefinition.handler(context);

      expect(result.error?.message).toContain('Invalid KQL condition');
      expect(result.error?.message).toContain('item.owner: hello world owner: x');
      expect(result.error?.message).not.toContain('__wftpl_');
    });
  });
});
