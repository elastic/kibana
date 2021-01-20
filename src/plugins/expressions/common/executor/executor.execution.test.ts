/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Executor } from './executor';
import { parseExpression } from '../ast';

// eslint-disable-next-line
const { __getArgs } = require('../execution/execution');

jest.mock('../execution/execution', () => {
  const mockedModule = {
    args: undefined,
    __getArgs: () => mockedModule.args,
    Execution: function ExecutionMock(...args: any) {
      mockedModule.args = args;
    },
  };

  return mockedModule;
});

describe('Executor mocked execution tests', () => {
  describe('createExecution()', () => {
    describe('when execution is created from string', () => {
      test('passes expression string to Execution', () => {
        const executor = new Executor();
        executor.createExecution('foo bar="baz"');

        expect(__getArgs()[0].expression).toBe('foo bar="baz"');
      });
    });

    describe('when execution is created from AST', () => {
      test('does not pass in expression string', () => {
        const executor = new Executor();
        const ast = parseExpression('foo bar="baz"');
        executor.createExecution(ast);

        expect(__getArgs()[0].expression).toBe(undefined);
      });
    });
  });
});
