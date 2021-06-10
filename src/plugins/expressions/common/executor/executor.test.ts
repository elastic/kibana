/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Executor } from './executor';
import * as expressionTypes from '../expression_types';
import * as expressionFunctions from '../expression_functions';
import { Execution } from '../execution';
import { ExpressionAstFunction, parseExpression } from '../ast';
import { MigrateFunction } from '../../../kibana_utils/common/persistable_state';

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

    test('can retrieve all functions', () => {
      const executor = new Executor();
      executor.registerFunction(expressionFunctions.clog);
      const functions = executor.getFunctions();
      expect(Object.keys(functions)).toEqual(['clog']);
    });

    test('can retrieve all functions - 2', () => {
      const executor = new Executor();
      const functionSpecs = [
        expressionFunctions.clog,
        expressionFunctions.font,
        expressionFunctions.variableSet,
        expressionFunctions.variable,
        expressionFunctions.theme,
        expressionFunctions.cumulativeSum,
        expressionFunctions.derivative,
        expressionFunctions.movingAverage,
        expressionFunctions.mapColumn,
        expressionFunctions.math,
      ];
      for (const functionDefinition of functionSpecs) {
        executor.registerFunction(functionDefinition);
      }
      const functions = executor.getFunctions();

      expect(Object.keys(functions).sort()).toEqual(functionSpecs.map((spec) => spec.name).sort());
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

  describe('.inject', () => {
    const executor = new Executor();

    const injectFn = jest.fn().mockImplementation((args, references) => args);
    const extractFn = jest.fn().mockReturnValue({ args: {}, references: [] });
    const migrateFn = jest.fn().mockImplementation((args) => args);

    const fooFn = {
      name: 'foo',
      help: 'test',
      args: {
        bar: {
          types: ['string'],
          help: 'test',
        },
      },
      extract: (state: ExpressionAstFunction['arguments']) => {
        return extractFn(state);
      },
      inject: (state: ExpressionAstFunction['arguments']) => {
        return injectFn(state);
      },
      migrations: {
        '7.10.0': (((state: ExpressionAstFunction, version: string): ExpressionAstFunction => {
          return migrateFn(state, version);
        }) as any) as MigrateFunction,
        '7.10.1': (((state: ExpressionAstFunction, version: string): ExpressionAstFunction => {
          return migrateFn(state, version);
        }) as any) as MigrateFunction,
      },
      fn: jest.fn(),
    };
    executor.registerFunction(fooFn);

    test('calls inject function for every expression function in expression', () => {
      executor.inject(
        parseExpression('foo bar="baz" | foo bar={foo bar="baz" | foo bar={foo bar="baz"}}'),
        []
      );
      expect(injectFn).toBeCalledTimes(5);
    });

    describe('.extract', () => {
      test('calls extract function for every expression function in expression', () => {
        executor.extract(
          parseExpression('foo bar="baz" | foo bar={foo bar="baz" | foo bar={foo bar="baz"}}')
        );
        expect(extractFn).toBeCalledTimes(5);
      });
    });

    describe('.migrate', () => {
      test('calls migrate function for every expression function in expression', () => {
        executor.migrate(
          parseExpression('foo bar="baz" | foo bar={foo bar="baz" | foo bar={foo bar="baz"}}'),
          '7.10.0'
        );
        expect(migrateFn).toBeCalledTimes(5);
      });
    });
  });
});
