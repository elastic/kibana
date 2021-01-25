/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { first, skip, toArray } from 'rxjs/operators';
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

  it('passes mode to the renderer', async () => {
    const expressionLoader = new ExpressionLoader(element, 'testrender', {
      renderMode: 'edit',
    });
    await expressionLoader.render$.pipe(first()).toPromise();
    expect(__getLastRenderMode()).toEqual('edit');
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
    expect(expressionDataHandler.inspect()).toHaveProperty('tables');
    expect(expressionDataHandler.inspect()).toHaveProperty('requests');
  });
});
