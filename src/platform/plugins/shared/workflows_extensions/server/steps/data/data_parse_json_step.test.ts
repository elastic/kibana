/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataParseJsonStepDefinition } from './data_parse_json_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataParseJsonStepDefinition', () => {
  const createMockContext = (
    config: { source: unknown },
    input: Record<string, unknown> = {}
  ): StepHandlerContext<any, any> => ({
    config,
    input,
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
    stepId: 'test-parse-json-step',
    stepType: 'data.parseJson',
  });

  describe('valid JSON parsing', () => {
    it('should parse a JSON object string', async () => {
      const context = createMockContext({
        source: '{"name":"Alice","age":30}',
      });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toEqual({ name: 'Alice', age: 30 });
    });

    it('should parse a JSON array string', async () => {
      const context = createMockContext({
        source: '[1, 2, 3]',
      });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toEqual([1, 2, 3]);
    });

    it('should parse a JSON string value', async () => {
      const context = createMockContext({
        source: '"hello"',
      });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toBe('hello');
    });

    it('should parse a JSON number', async () => {
      const context = createMockContext({
        source: '42',
      });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toBe(42);
    });

    it('should parse JSON null', async () => {
      const context = createMockContext({
        source: 'null',
      });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toBeNull();
    });

    it('should parse a JSON boolean', async () => {
      const context = createMockContext({
        source: 'true',
      });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toBe(true);
    });

    it('should parse nested JSON objects', async () => {
      const source = JSON.stringify({
        user: { name: 'Alice', address: { city: 'NYC' } },
        tags: ['admin', 'user'],
      });
      const context = createMockContext({ source });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toEqual({
        user: { name: 'Alice', address: { city: 'NYC' } },
        tags: ['admin', 'user'],
      });
    });
  });

  describe('already-structured input passthrough', () => {
    it('should return an object as-is', async () => {
      const obj = { name: 'Alice', age: 30 };
      const context = createMockContext({ source: obj });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toEqual(obj);
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Source is already a structured type, returning as-is'
      );
    });

    it('should return an array as-is', async () => {
      const arr = [1, 2, 3];
      const context = createMockContext({ source: arr });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toEqual(arr);
    });

    it('should return a number as-is', async () => {
      const context = createMockContext({ source: 42 });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toBe(42);
    });

    it('should return a boolean as-is', async () => {
      const context = createMockContext({ source: true });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.output).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error for invalid JSON', async () => {
      const context = createMockContext({ source: '{invalid json}' });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid JSON');
    });

    it('should return error for null source', async () => {
      const context = createMockContext({ source: null });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Source is null or undefined');
    });

    it('should return error for undefined source', async () => {
      const context = createMockContext({ source: undefined });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Source is null or undefined');
    });

    it('should return error for truncated JSON', async () => {
      const context = createMockContext({ source: '{"name": "Alice"' });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid JSON');
    });

    it('should return error when source exceeds max size', async () => {
      const largeSource = 'x'.repeat(10 * 1024 * 1024 + 1);
      const context = createMockContext({ source: largeSource });
      const result = await dataParseJsonStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('exceeds maximum allowed size');
    });
  });
});
