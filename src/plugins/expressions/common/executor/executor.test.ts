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
import { ExpressionAstFunction, parseExpression, formatExpression } from '../ast';
import { MigrateFunction } from '@kbn/kibana-utils-plugin/common/persistable_state';
import { SavedObjectReference } from '@kbn/core/types';

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
        const foo = {};
        const executor = new Executor({ context: { foo }, functions: {}, types: {} });
        const execution = executor.createExecution('foo bar="baz"');

        expect(execution.context).toHaveProperty('foo', foo);
      });
    });
  });

  describe('.inject', () => {
    const executor = new Executor();

    const injectFn = jest.fn().mockImplementation((args, references) => args);
    const extractFn = jest.fn().mockImplementation((state) => ({ state, references: [] }));
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
        '7.10.0': ((state: ExpressionAstFunction, version: string): ExpressionAstFunction => {
          return migrateFn(state, version);
        }) as unknown as MigrateFunction,
        '7.10.1': ((state: ExpressionAstFunction, version: string): ExpressionAstFunction => {
          return migrateFn(state, version);
        }) as unknown as MigrateFunction,
      },
      fn: jest.fn(),
    };

    const refFnRefName = 'ref.id';

    const refFn = {
      name: 'ref',
      help: 'test',
      args: {
        id: {
          types: ['string'],
          help: 'will be extracted',
        },
        other: {
          types: ['string'],
          help: 'other arg',
        },
        nullable: {
          types: ['string', 'null'],
          help: 'nullable arg',
          default: null,
        },
      },
      extract: (state: ExpressionAstFunction['arguments']) => {
        const references: SavedObjectReference[] = [
          {
            name: refFnRefName,
            type: 'ref',
            id: state.id[0] as string,
          },
        ];

        return {
          state: {
            ...state,
            id: [refFnRefName],
          },
          references,
        };
      },
      inject: (state: ExpressionAstFunction['arguments'], references: SavedObjectReference[]) => {
        const reference = references.find((ref) => ref.name === refFnRefName);
        if (reference) {
          state.id[0] = reference.id;
        }
        return state;
      },
      fn: jest.fn(),
    };
    executor.registerFunction(fooFn);
    executor.registerFunction(refFn);

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

      test('extracts references with the proper step key', () => {
        const expression = `ref id="my-id" other={ref id="nested-id" other="other" | foo bar="baz"}`;
        const { state, references } = executor.extract(parseExpression(expression));

        expect(references[0].name).toBe('l0_ref.id');
        expect(references[0].id).toBe('nested-id');
        expect(references[1].name).toBe('l2_ref.id');
        expect(references[1].id).toBe('my-id');

        expect(formatExpression(executor.inject(state, references))).toBe(expression);
      });

      test('allows expression function argument to be null', () => {
        const expression = `ref nullable=null id="my-id" other={ref id="nested-id" other="other" | foo bar="baz"}`;
        const { state, references } = executor.extract(parseExpression(expression));

        expect(state.chain[0].arguments.nullable[0]).toBeNull();
        expect(formatExpression(executor.inject(state, references))).toBe(expression);
      });
    });

    describe('.getAllMigrations', () => {
      test('returns list of all registered migrations', () => {
        const migrations = executor.getAllMigrations();
        expect(migrations).toMatchSnapshot();
      });
    });

    describe('.migrateToLatest', () => {
      const fnMigrateTo = {
        name: 'fnMigrateTo',
        help: 'test',
        args: {
          bar: {
            types: ['string'],
            help: 'test',
          },
        },
        fn: jest.fn(),
      };

      const fnMigrateFrom = {
        name: 'fnMigrateFrom',
        help: 'test',
        args: {
          bar: {
            types: ['string'],
            help: 'test',
          },
        },
        migrations: {
          '8.1.0': ((state: ExpressionAstFunction, version: string) => {
            const migrateToAst = parseExpression('fnMigrateTo');
            const { arguments: args } = state;
            const ast = { ...migrateToAst.chain[0], arguments: args };
            return { type: 'expression', chain: [ast, ast] };
          }) as unknown as MigrateFunction,
        },
        fn: jest.fn(),
      };
      executor.registerFunction(fnMigrateFrom);
      executor.registerFunction(fnMigrateTo);

      test('calls migrate function for every expression function in expression', () => {
        executor.migrateToLatest({
          state: parseExpression(
            'foo bar="baz" | foo bar={foo bar="baz" | foo bar={foo bar="baz"}}'
          ),
          version: '7.10.0',
        });
        expect(migrateFn).toBeCalledTimes(5);
      });

      test('migrates expression function to expression function or chain of expression functions', () => {
        const plainExpression = 'foo bar={foo bar="baz" | foo bar={foo bar="baz"}}';
        const plainExpressionAst = parseExpression(plainExpression);
        const migratedExpressionAst = executor.migrateToLatest({
          state: parseExpression(`${plainExpression} | fnMigrateFrom bar="baz" | fnMigrateTo`),
          version: '8.0.0',
        });

        expect(migratedExpressionAst).toEqual({
          type: 'expression',
          chain: [
            ...plainExpressionAst.chain,
            { type: 'function', function: 'fnMigrateTo', arguments: { bar: ['baz'] } },
            { type: 'function', function: 'fnMigrateTo', arguments: { bar: ['baz'] } },
            { type: 'function', function: 'fnMigrateTo', arguments: {} },
          ],
        });
      });
    });
  });
});
