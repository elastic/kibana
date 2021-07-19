/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { first, skip, toArray } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { loader, ExpressionLoader } from './loader';
import { Observable } from 'rxjs';
import {
  parseExpression,
  IInterpreterRenderHandlers,
  RenderMode,
  AnyExpressionFunctionDefinition,
} from '../common';

// eslint-disable-next-line
const { __getLastExecution, __getLastRenderMode } = require('./services');

const element: HTMLElement = null as any;

let testScheduler: TestScheduler;

jest.mock('./services', () => {
  let renderMode: RenderMode | undefined;
  const renderers: Record<string, unknown> = {
    test: {
      render: (el: HTMLElement, value: unknown, handlers: IInterpreterRenderHandlers) => {
        renderMode = handlers.getRenderMode();
        handlers.done();
      },
    },
  };

  // eslint-disable-next-line
  const service = new (require('../common/service/expressions_services').ExpressionsService as any)();

  const testFn: AnyExpressionFunctionDefinition = {
    fn: () => ({ type: 'render', as: 'test' }),
    name: 'testrender',
    args: {},
    help: '',
  };
  service.registerFunction(testFn);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  for (const func of require('../common/test_helpers/expression_functions').functionTestSpecs) {
    service.registerFunction(func);
  }

  const moduleMock = {
    __execution: undefined,
    __getLastExecution: () => moduleMock.__execution,
    __getLastRenderMode: () => renderMode,
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

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected));
  });

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
    const { result } = await expressionLoader.data$.pipe(first()).toPromise();
    expect(result).toBe(123);
  });

  it('ignores partial results by default', async () => {
    const expressionLoader = new ExpressionLoader(element, 'var foo', {
      variables: { foo: of(1, 2) },
    });
    const { result, partial } = await expressionLoader.data$.pipe(first()).toPromise();

    expect(partial).toBe(false);
    expect(result).toBe(2);
  });

  it('emits partial results if enabled', async () => {
    const expressionLoader = new ExpressionLoader(element, 'var foo', {
      variables: { foo: of(1, 2) },
      partial: true,
      throttle: 0,
    });
    const { result, partial } = await expressionLoader.data$.pipe(first()).toPromise();

    expect(partial).toBe(true);
    expect(result).toBe(1);
  });

  it('throttles partial results', async () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const expressionLoader = new ExpressionLoader(element, 'var foo', {
        variables: { foo: cold('a 5ms b 5ms c 10ms d', { a: 1, b: 2, c: 3, d: 4 }) },
        partial: true,
        throttle: 20,
      });

      expectObservable(expressionLoader.data$).toBe('a 19ms c 2ms d', {
        a: expect.objectContaining({ result: 1 }),
        c: expect.objectContaining({ result: 3 }),
        d: expect.objectContaining({ result: 4 }),
      });
    });
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

  it('passes mode to the renderer', async () => {
    const expressionLoader = new ExpressionLoader(element, 'testrender', {
      renderMode: 'edit',
    });
    await expressionLoader.render$.pipe(first()).toPromise();
    expect(__getLastRenderMode()).toEqual('edit');
  });

  it('cancels the previous request when the expression is updated', () => {
    const expressionLoader = new ExpressionLoader(element, 'sleep 10', {});
    const execution = __getLastExecution();
    jest.spyOn(execution, 'cancel');

    expect(execution.cancel).toHaveBeenCalledTimes(0);
    expressionLoader.update('var bar', {});
    expect(execution.cancel).toHaveBeenCalledTimes(1);
  });

  it('inspect() returns correct inspector adapters', () => {
    const expressionDataHandler = new ExpressionLoader(element, expressionString, {});
    expect(expressionDataHandler.inspect()).toHaveProperty('tables');
    expect(expressionDataHandler.inspect()).toHaveProperty('requests');
  });
});
