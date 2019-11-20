/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Executor } from './executor';
import * as expressionTypes from '../expression_types';
import * as expressionFunctions from '../expression_functions';
import { Execution } from '../execution';
import { parseExpression } from '../ast';

describe('Executor', () => {
  test('can instantiate', () => {
    new Executor();
  });

  describe('type registry', () => {
    test('can register a type', () => {
      const executor = new Executor();
      executor.registerType(expressionTypes.datatable);
    });

    test('can register all types', () => {
      const executor = new Executor();
      for (const type of expressionTypes.typeSpecs) executor.registerType(type);
    });

    test('can retrieve all types', () => {
      const executor = new Executor();
      executor.registerType(expressionTypes.datatable);
      const types = executor.getTypes();
      expect(Object.keys(types)).toEqual(['datatable']);
    });

    test('can retrieve all types - 2', () => {
      const executor = new Executor();
      for (const type of expressionTypes.typeSpecs) executor.registerType(type);
      const types = executor.getTypes();
      expect(Object.keys(types).sort()).toEqual(
        expressionTypes.typeSpecs.map((spec) => spec.name).sort()
      );
    });
  });

  describe('function registry', () => {
    test('can register a function', () => {
      const executor = new Executor();
      executor.registerFunction(expressionFunctions.clog);
    });

    test('can register all functions', () => {
      const executor = new Executor();
      for (const functionDefinition of expressionFunctions.functionSpecs)
        executor.registerFunction(functionDefinition);
    });

    test('can retrieve all functions', () => {
      const executor = new Executor();
      executor.registerFunction(expressionFunctions.clog);
      const functions = executor.getFunctions();
      expect(Object.keys(functions)).toEqual(['clog']);
    });

    test('can retrieve all functions - 2', () => {
      const executor = new Executor();
      for (const functionDefinition of expressionFunctions.functionSpecs)
        executor.registerFunction(functionDefinition);
      const functions = executor.getFunctions();
      expect(Object.keys(functions).sort()).toEqual(
        expressionFunctions.functionSpecs.map((spec) => spec.name).sort()
      );
    });
  });

  describe('context', () => {
    test('context is empty by default', () => {
      const executor = new Executor();
      expect(executor.context).toEqual({});
    });

    test('can extend context', () => {
      const executor = new Executor();
      executor.extendContext({
        foo: 'bar',
      });
      expect(executor.context).toEqual({
        foo: 'bar',
      });
    });

    test('can extend context multiple times with multiple keys', () => {
      const executor = new Executor();
      const abortSignal = {};
      const env = {};

      executor.extendContext({
        foo: 'bar',
      });
      executor.extendContext({
        abortSignal,
        env,
      });

      expect(executor.context).toEqual({
        foo: 'bar',
        abortSignal,
        env,
      });
    });
  });

  describe('execution', () => {
    describe('createExecution()', () => {
      test('returns Execution object from string', () => {
        const executor = new Executor();
        const execution = executor.createExecution('foo bar="baz"');

        expect(execution).toBeInstanceOf(Execution);
        expect(execution.state.get().ast.chain[0].function).toBe('foo');
      });

      test('returns Execution object from AST', () => {
        const executor = new Executor();
        const ast = parseExpression('foo bar="baz"');
        const execution = executor.createExecution(ast);

        expect(execution).toBeInstanceOf(Execution);
        expect(execution.state.get().ast.chain[0].function).toBe('foo');
      });

      test('Execution inherits context from Executor', () => {
        const executor = new Executor();
        const foo = {};
        executor.extendContext({ foo });
        const execution = executor.createExecution('foo bar="baz"');

        expect((execution.context as any).foo).toBe(foo);
      });
    });
  });

  describe('caching', () => {
    const functionCache: Map<string, any> = new Map();
    const fakeCacheEntry = { type: 'kibana_context', value: 'test' };
    let executor: Executor;

    beforeAll(() => {
      executor = new Executor(undefined, functionCache);
      executor.registerFunction(expressionFunctions.variable);
      executor.registerFunction(expressionFunctions.kibana);
    });

    afterEach(() => {
      functionCache.clear();
    });

    it('caches the result of function', async () => {
      await executor.run('kibana', null);
      expect(functionCache.size).toEqual(1);
      const entry = functionCache.keys().next().value;
      functionCache.set(entry, fakeCacheEntry);
      const result = await executor.run('kibana', null);
      expect(functionCache.size).toEqual(1);
      expect(result).toEqual(fakeCacheEntry);
    });

    it('doesnt cache if disableCache flag is enabled', async () => {
      await executor.run('kibana', null);
      expect(functionCache.size).toEqual(1);
      const entry = functionCache.keys().next().value;
      functionCache.set(entry, fakeCacheEntry);
      const result = await executor.run('kibana', null, { disableCache: true });
      expect(functionCache.size).toEqual(1);
      expect(result).not.toEqual(fakeCacheEntry);
    });

    it('doesnt cache results of functions that have disableCache property set', async () => {
      await executor.run('var name="test"', null);
      expect(functionCache.size).toEqual(0);
    });

    describe('doesnt use cached version', () => {
      const cachedVersion = { test: 'value' };

      beforeAll(async () => {
        await executor.run('kibana', null);
        expect(functionCache.size).toEqual(1);
        const entry: string = Object.keys(functionCache)[0];
        functionCache.set(entry, cachedVersion);
      });

      it('input changed', async () => {
        const result = await executor.run('kibana', { type: 'kibana_context', value: 'test' });
        expect(result).not.toEqual(cachedVersion);
      });

      it('arguments changed', async () => {
        const result = await executor.run('kibana', null);
        expect(result).not.toEqual(cachedVersion);
      });

      it('search context changed', async () => {
        const result = await executor.run('kibana', null, { search: { filters: [] } });
        expect(result).not.toEqual(cachedVersion);
      });
    });
  });
});
