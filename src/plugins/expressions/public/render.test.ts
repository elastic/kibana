/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionRenderHandler, render } from './render';
import { Observable } from 'rxjs';
import { SerializableRecord } from '@kbn/utility-types';
import { ExpressionRenderError } from './types';
import { getRenderersRegistry } from './services';
import { first, take, toArray } from 'rxjs/operators';
import { IInterpreterRenderHandlers } from '../common';

const element: HTMLElement = {} as HTMLElement;
const mockNotificationService = {
  toasts: {
    addError: jest.fn(() => {}),
  },
};
jest.mock('./services', () => {
  const renderers: Record<string, unknown> = {
    test: {
      render: (el: HTMLElement, value: unknown, handlers: IInterpreterRenderHandlers) => {
        handlers.done();
      },
    },
  };

  return {
    getRenderersRegistry: jest.fn(() => ({
      get: jest.fn((id: string) => renderers[id]),
    })),
    getNotifications: jest.fn(() => {
      return mockNotificationService;
    }),
  };
});

const mockMockErrorRenderFunction = jest.fn(
  (el: HTMLElement, error: ExpressionRenderError, handlers: IInterpreterRenderHandlers) =>
    handlers.done()
);
// extracts data from mockMockErrorRenderFunction call to assert in tests
const getHandledError = () => {
  try {
    return mockMockErrorRenderFunction.mock.calls[0][1];
  } catch (e) {
    return null;
  }
};

describe('render helper function', () => {
  it('returns ExpressionRenderHandler instance', async () => {
    const response = await render(element, {});
    expect(response).toBeInstanceOf(ExpressionRenderHandler);
  });
});

describe('ExpressionRenderHandler', () => {
  it('constructor creates observers', () => {
    const expressionRenderHandler = new ExpressionRenderHandler(element);
    expect(expressionRenderHandler.events$).toBeInstanceOf(Observable);
    expect(expressionRenderHandler.render$).toBeInstanceOf(Observable);
    expect(expressionRenderHandler.update$).toBeInstanceOf(Observable);
  });

  it('getElement returns the element', () => {
    const expressionRenderHandler = new ExpressionRenderHandler(element);
    expect(expressionRenderHandler.getElement()).toBe(element);
  });

  describe('render()', () => {
    beforeEach(() => {
      mockMockErrorRenderFunction.mockClear();
      mockNotificationService.toasts.addError.mockClear();
    });

    it('in case of error render$ should emit when error renderer is finished', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      expressionRenderHandler.render(false as unknown as SerializableRecord);
      const promise1 = expressionRenderHandler.render$.pipe(first()).toPromise();
      await expect(promise1).resolves.toEqual(1);

      expressionRenderHandler.render(false as unknown as SerializableRecord);
      const promise2 = expressionRenderHandler.render$.pipe(first()).toPromise();
      await expect(promise2).resolves.toEqual(2);
    });

    it('should use custom error handler if provided', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element, {
        onRenderError: mockMockErrorRenderFunction,
      });
      await expressionRenderHandler.render(false as unknown as SerializableRecord);
      expect(getHandledError()!.message).toEqual(
        `invalid data provided to the expression renderer`
      );
    });

    it('should throw error if the rendering function throws', async () => {
      (getRenderersRegistry as jest.Mock).mockReturnValueOnce({ get: () => true });
      (getRenderersRegistry as jest.Mock).mockReturnValueOnce({
        get: () => ({
          render: () => {
            throw new Error('renderer error');
          },
        }),
      });

      const expressionRenderHandler = new ExpressionRenderHandler(element, {
        onRenderError: mockMockErrorRenderFunction,
      });
      await expressionRenderHandler.render({ type: 'render', as: 'something' });
      expect(getHandledError()!.message).toEqual('renderer error');
    });

    it('should pass through provided "hasCompatibleActions" to the expression renderer', async () => {
      const hasCompatibleActions = jest.fn();
      (getRenderersRegistry as jest.Mock).mockReturnValueOnce({ get: () => true });
      (getRenderersRegistry as jest.Mock).mockReturnValueOnce({
        get: () => ({
          render: (domNode: HTMLElement, config: unknown, handlers: IInterpreterRenderHandlers) => {
            handlers.hasCompatibleActions!({
              name: 'something',
              data: 'bar',
            });
          },
        }),
      });

      const expressionRenderHandler = new ExpressionRenderHandler(element, {
        onRenderError: mockMockErrorRenderFunction,
        hasCompatibleActions,
      });
      expect(hasCompatibleActions).toHaveBeenCalledTimes(0);
      await expressionRenderHandler.render({ type: 'render', as: 'something' });
      expect(hasCompatibleActions).toHaveBeenCalledTimes(1);
      expect(hasCompatibleActions.mock.calls[0][0]).toEqual({
        name: 'something',
        data: 'bar',
      });
    });

    it('sends a next observable once rendering is complete', () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      expect.assertions(1);
      return new Promise<void>((resolve) => {
        expressionRenderHandler.render$.subscribe((renderCount) => {
          expect(renderCount).toBe(1);
          resolve();
        });

        expressionRenderHandler.render({ type: 'render', as: 'test' });
      });
    });

    it('default renderer should use notification service', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      const promise1 = expressionRenderHandler.render$.pipe(first()).toPromise();
      expressionRenderHandler.render(false as unknown as SerializableRecord);
      await expect(promise1).resolves.toEqual(1);
      expect(mockNotificationService.toasts.addError).toBeCalledWith(
        expect.objectContaining({
          message: 'invalid data provided to the expression renderer',
        }),
        {
          title: 'Error in visualisation',
          toastMessage: 'invalid data provided to the expression renderer',
        }
      );
    });

    // in case render$ subscription happen after render() got called
    // we still want to be notified about sync render$ updates
    it("doesn't swallow sync render errors", async () => {
      const expressionRenderHandler1 = new ExpressionRenderHandler(element, {
        onRenderError: mockMockErrorRenderFunction,
      });
      expressionRenderHandler1.render(false as unknown as SerializableRecord);
      const renderPromiseAfterRender = expressionRenderHandler1.render$.pipe(first()).toPromise();
      await expect(renderPromiseAfterRender).resolves.toEqual(1);
      expect(getHandledError()!.message).toEqual(
        'invalid data provided to the expression renderer'
      );

      mockMockErrorRenderFunction.mockClear();

      const expressionRenderHandler2 = new ExpressionRenderHandler(element, {
        onRenderError: mockMockErrorRenderFunction,
      });
      const renderPromiseBeforeRender = expressionRenderHandler2.render$.pipe(first()).toPromise();
      expressionRenderHandler2.render(false as unknown as SerializableRecord);
      await expect(renderPromiseBeforeRender).resolves.toEqual(1);
      expect(getHandledError()!.message).toEqual(
        'invalid data provided to the expression renderer'
      );
    });

    // it is expected side effect of using BehaviorSubject for render$,
    // that observables will emit previous result if subscription happens after render
    it('should emit previous render and error results', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      expressionRenderHandler.render(false as unknown as SerializableRecord);
      const renderPromise = expressionRenderHandler.render$.pipe(take(2), toArray()).toPromise();
      expressionRenderHandler.render(false as unknown as SerializableRecord);
      await expect(renderPromise).resolves.toEqual([1, 2]);
    });
  });
});
