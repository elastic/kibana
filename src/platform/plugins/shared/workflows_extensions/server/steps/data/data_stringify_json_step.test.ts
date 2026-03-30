/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataStringifyJsonStepDefinition } from './data_stringify_json_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataStringifyJsonStepDefinition', () => {
  const createMockContext = (
    config: { source: unknown },
    input: { pretty?: boolean } = {}
  ): StepHandlerContext<any, any> => ({
    config,
    input: { pretty: input.pretty ?? false },
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
    stepId: 'test-to-json-step',
    stepType: 'data.stringifyJson',
  });

  describe('basic stringification', () => {
    it('should stringify an object', async () => {
      const context = createMockContext({ source: { name: 'Alice', age: 30 } });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).toBe('{"name":"Alice","age":30}');
    });

    it('should stringify an array', async () => {
      const context = createMockContext({ source: [1, 2, 3] });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).toBe('[1,2,3]');
    });

    it('should stringify a string', async () => {
      const context = createMockContext({ source: 'hello' });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).toBe('"hello"');
    });

    it('should stringify a number', async () => {
      const context = createMockContext({ source: 42 });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).toBe('42');
    });

    it('should stringify a boolean', async () => {
      const context = createMockContext({ source: true });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).toBe('true');
    });

    it('should stringify null', async () => {
      const context = createMockContext({ source: null });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).toBe('null');
    });

    it('should stringify nested objects', async () => {
      const source = {
        user: { name: 'Alice', address: { city: 'NYC' } },
        tags: ['admin', 'user'],
      };
      const context = createMockContext({ source });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).toBe(JSON.stringify(source));
    });
  });

  describe('pretty printing', () => {
    it('should pretty-print when pretty is true', async () => {
      const source = { name: 'Alice', age: 30 };
      const context = createMockContext({ source }, { pretty: true });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).toBe(JSON.stringify(source, null, 2));
      expect(result.output).toContain('\n');
    });

    it('should not pretty-print when pretty is false', async () => {
      const source = { name: 'Alice', age: 30 };
      const context = createMockContext({ source }, { pretty: false });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.output).not.toContain('\n');
    });
  });

  describe('error handling', () => {
    it('should return error for circular references', async () => {
      const obj: Record<string, unknown> = { name: 'Alice' };
      obj.self = obj;
      const context = createMockContext({ source: obj });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('circular reference');
    });

    it('should return error for undefined source (non-serializable)', async () => {
      const context = createMockContext({ source: undefined });
      const result = await dataStringifyJsonStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('cannot be serialized to JSON');
    });
  });
});
