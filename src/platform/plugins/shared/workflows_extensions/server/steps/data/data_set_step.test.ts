/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataSetStepDefinition } from './data_set_step';
import type { StepHandlerContext } from '../../step_registry/types';

const createMockContext = (
  input: Record<string, unknown>
): StepHandlerContext<Record<string, unknown>> => ({
  input,
  rawInput: input,
  contextManager: {
    setVariables: jest.fn(),
  } as any,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'data.set',
});

describe('dataSetStepDefinition', () => {
  describe('handler', () => {
    it('should return input as output for simple variables', async () => {
      const input = {
        user_id: '12345',
        email: 'user@example.com',
        is_active: true,
      };

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result).toEqual({ output: input });
    });

    it('should preserve string values', async () => {
      const input = {
        name: 'John Doe',
        message: 'Hello World',
      };

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result.output).toEqual(input);
    });

    it('should preserve number values', async () => {
      const input = {
        age: 25,
        count: 100,
        price: 99.99,
      };

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result.output).toEqual(input);
    });

    it('should preserve boolean values', async () => {
      const input = {
        is_active: true,
        is_verified: false,
      };

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result.output).toEqual(input);
    });

    it('should preserve nested objects', async () => {
      const input = {
        profile: {
          name: 'John Doe',
          age: 30,
          address: {
            city: 'San Francisco',
            country: 'USA',
          },
        },
      };

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result.output).toEqual(input);
    });

    it('should preserve arrays', async () => {
      const input = {
        tags: ['workflow', 'automation', 'data'],
        numbers: [1, 2, 3, 4, 5],
        mixed: ['string', 42, true, { key: 'value' }],
      };

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result.output).toEqual(input);
    });

    it('should handle empty object', async () => {
      const input = {};

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result.output).toEqual({});
    });

    it('should handle null and undefined values', async () => {
      const input = {
        nullable: null,
        optional: undefined,
      };

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result.output).toEqual(input);
    });

    it('should log variable count', async () => {
      const input = {
        var1: 'value1',
        var2: 'value2',
        var3: 'value3',
      };

      const context = createMockContext(input);
      await dataSetStepDefinition.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith('Set 3 variable(s)', {
        variables: ['var1', 'var2', 'var3'],
      });
    });

    it('should handle errors gracefully', async () => {
      const input = { key: 'value' };
      const context = createMockContext(input);

      jest.spyOn(Object, 'keys').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = await dataSetStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
      expect(context.logger.error).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should preserve complex data types', async () => {
      const date = new Date('2024-01-01');
      const input = {
        date,
        regex: /test/g,
        complexArray: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      };

      const context = createMockContext(input);
      const result = await dataSetStepDefinition.handler(context);

      expect(result.output).toEqual(input);
      expect(result.output?.date).toBe(date);
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(dataSetStepDefinition.id).toBe('data.set');
    });

    it('should accept any record of string to unknown', () => {
      const validInputs = [
        { key: 'value' },
        { num: 42 },
        { bool: true },
        { nested: { deep: { value: 'test' } } },
        { array: [1, 2, 3] },
      ];

      validInputs.forEach((input) => {
        const parseResult = dataSetStepDefinition.inputSchema.safeParse(input);
        expect(parseResult.success).toBe(true);
      });
    });

    it('should validate output schema', () => {
      const output = { key: 'value', num: 42 };
      const parseResult = dataSetStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
