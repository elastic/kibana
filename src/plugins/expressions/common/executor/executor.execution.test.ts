/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Executor } from './executor';
import { parseExpression } from '../ast';
import { Execution } from '../execution/execution';

jest.mock('../execution/execution', () => ({
  Execution: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Executor mocked execution tests', () => {
  describe('createExecution()', () => {
    describe('when execution is created from string', () => {
      test('passes expression string to Execution', () => {
        const executor = new Executor();
        executor.createExecution('foo bar="baz"');

        expect(Execution).toHaveBeenCalledWith(
          expect.objectContaining({ expression: 'foo bar="baz"' }),
          undefined
        );
      });
    });

    describe('when execution is created from AST', () => {
      test('does not pass in expression string', () => {
        const executor = new Executor();
        const ast = parseExpression('foo bar="baz"');
        executor.createExecution(ast);

        expect(Execution).toHaveBeenCalledWith(
          expect.not.objectContaining({ expression: expect.anything() }),
          undefined
        );
      });
    });
  });
});
