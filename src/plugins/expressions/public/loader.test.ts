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

import { first, skip, toArray } from 'rxjs/operators';
import { loader, ExpressionLoader } from './loader';
import { Observable } from 'rxjs';
import { ExpressionAstExpression, parseExpression, IInterpreterRenderHandlers } from '../common';

// eslint-disable-next-line
const { __getLastExecution } = require('./services');

const element: HTMLElement = null as any;

jest.mock('./services', () => {
  const renderers: Record<string, unknown> = {
    test: {
      render: (el: HTMLElement, value: unknown, handlers: IInterpreterRenderHandlers) => {
        handlers.done();
      },
    },
  };

  // eslint-disable-next-line
  const service = new (require('../common/service/expressions_services').ExpressionsService as any)();

  const moduleMock = {
    __execution: undefined,
    __getLastExecution: () => moduleMock.__execution,
    getInterpreter: () => {
      return {
        interpretAst: async (expression: ExpressionAstExpression) => {
          return { type: 'render', as: 'test' };
        },
      };
    },
    getRenderersRegistry: () => ({
      get: (id: string) => renderers[id],
    }),
    getNotifications: jest.fn(() => {
      return {
        toasts: {
          addError: jest.fn(() => {}),
        },
      };
    }),
    getExpressionsService: () => service,
  };

  const execute = service.execute;
  service.execute = (...args: any) => {
    const execution = execute(...args);
    jest.spyOn(execution, 'getData');
    jest.spyOn(execution, 'cancel');
    moduleMock.__execution = execution;
    return execution;
  };

  return moduleMock;
});

describe('execute helper function', () => {
  it('returns ExpressionLoader instance', () => {
    const response = loader(element, '', {});
    expect(response).toBeInstanceOf(ExpressionLoader);
  });
});

describe('ExpressionLoader', () => {
  const expressionString = 'demodata';

  describe('constructor', () => {
    it('accepts expression string', () => {
      const expressionLoader = new ExpressionLoader(element, expressionString, {});
      expect(expressionLoader.getExpression()).toEqual(expressionString);
    });

    it('accepts expression AST', () => {
      const expressionAST = parseExpression(expressionString);
      const expressionLoader = new ExpressionLoader(element, expressionAST, {});
      expect(expressionLoader.getExpression()).toEqual(expressionString);
      expect(expressionLoader.getAst()).toEqual(expressionAST);
    });

    it('creates observables', () => {
      const expressionLoader = new ExpressionLoader(element, expressionString, {});
      expect(expressionLoader.events$).toBeInstanceOf(Observable);
      expect(expressionLoader.render$).toBeInstanceOf(Observable);
      expect(expressionLoader.update$).toBeInstanceOf(Observable);
      expect(expressionLoader.data$).toBeInstanceOf(Observable);
    });
  });

  it('emits on $data when data is available', async () => {
    const expressionLoader = new ExpressionLoader(element, 'var foo', { variables: { foo: 123 } });
    const response = await expressionLoader.data$.pipe(first()).toPromise();
    expect(response).toBe(123);
  });

  it('emits on loading$ on initial load and on updates', async () => {
    const expressionLoader = new ExpressionLoader(element, expressionString, {});
    const loadingPromise = expressionLoader.loading$.pipe(toArray()).toPromise();
    expressionLoader.update('test');
    expressionLoader.update('');
    expressionLoader.update();
    expressionLoader.destroy();
    expect(await loadingPromise).toHaveLength(4);
  });

  it('emits on render$ when rendering is done', async () => {
    const expressionLoader = new ExpressionLoader(element, expressionString, {});
    const response = await expressionLoader.render$.pipe(first()).toPromise();
    expect(response).toBe(1);
  });

  it('allows updating configuration', async () => {
    const expressionLoader = new ExpressionLoader(element, expressionString, {});
    let response = await expressionLoader.render$.pipe(first()).toPromise();
    expect(response).toBe(1);
    expressionLoader.update('test');
    response = await expressionLoader.render$.pipe(skip(1), first()).toPromise();
    expect(response).toBe(2);
  });

  it('cancels the previous request when the expression is updated', () => {
    const expressionLoader = new ExpressionLoader(element, 'var foo', {});
    const execution = __getLastExecution();
    jest.spyOn(execution, 'cancel');

    expect(execution.cancel).toHaveBeenCalledTimes(0);
    expressionLoader.update('var bar', {});
    expect(execution.cancel).toHaveBeenCalledTimes(1);
  });

  it('inspect() returns correct inspector adapters', () => {
    const expressionDataHandler = new ExpressionLoader(element, expressionString, {});
    expect(expressionDataHandler.inspect()).toHaveProperty('data');
    expect(expressionDataHandler.inspect()).toHaveProperty('requests');
  });
});
