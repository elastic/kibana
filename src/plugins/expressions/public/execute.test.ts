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

import { fromExpression } from '@kbn/interpreter/common';
import { execute, ExpressionDataHandler } from './execute';
import { ExpressionAST } from '../common/types';

jest.mock('./services', () => ({
  getInterpreter: () => {
    return {
      interpretAst: async (expression: ExpressionAST) => {
        return {};
      },
    };
  },
  getNotifications: jest.fn(() => {
    return {
      toasts: {
        addError: jest.fn(() => {}),
      },
    };
  }),
}));

describe('execute helper function', () => {
  it('returns ExpressionDataHandler instance', () => {
    const response = execute('');
    expect(response).toBeInstanceOf(ExpressionDataHandler);
  });
});

describe('ExpressionDataHandler', () => {
  const expressionString = '';

  describe('constructor', () => {
    it('accepts expression string', () => {
      const expressionDataHandler = new ExpressionDataHandler(expressionString, {});
      expect(expressionDataHandler.getExpression()).toEqual(expressionString);
    });

    it('accepts expression AST', () => {
      const expressionAST = fromExpression(expressionString) as ExpressionAST;
      const expressionDataHandler = new ExpressionDataHandler(expressionAST, {});
      expect(expressionDataHandler.getExpression()).toEqual(expressionString);
      expect(expressionDataHandler.getAst()).toEqual(expressionAST);
    });

    it('allows passing in context', () => {
      const expressionDataHandler = new ExpressionDataHandler(expressionString, {
        context: { test: 'hello' },
      });
      expect(expressionDataHandler.getExpression()).toEqual(expressionString);
    });

    it('allows passing in search context', () => {
      const expressionDataHandler = new ExpressionDataHandler(expressionString, {
        searchContext: { type: 'kibana_context', filters: [] },
      });
      expect(expressionDataHandler.getExpression()).toEqual(expressionString);
    });
  });

  describe('getData()', () => {
    it('returns a promise', () => {
      const expressionDataHandler = new ExpressionDataHandler(expressionString, {});
      expect(expressionDataHandler.getData()).toBeInstanceOf(Promise);
    });

    it('promise resolves with data', async () => {
      const expressionDataHandler = new ExpressionDataHandler(expressionString, {});
      expect(await expressionDataHandler.getData()).toEqual({});
    });
  });

  it('cancel() aborts request', () => {
    const expressionDataHandler = new ExpressionDataHandler(expressionString, {});
    expressionDataHandler.cancel();
  });

  it('inspect() returns correct inspector adapters', () => {
    const expressionDataHandler = new ExpressionDataHandler(expressionString, {});
    expect(expressionDataHandler.inspect()).toHaveProperty('requests');
    expect(expressionDataHandler.inspect()).toHaveProperty('data');
  });
});
