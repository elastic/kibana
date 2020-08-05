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
