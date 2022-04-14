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
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { ExpressionRenderError } from './types';
import { getRenderersRegistry, getUiActions } from './services';
import { first, take, toArray } from 'rxjs/operators';
import type { ExpressionRenderer, IInterpreterRenderHandlers } from '../common';
import _ from 'lodash';

const element: HTMLElement = {} as HTMLElement;
const mockNotificationService = {
  toasts: {
    addError: jest.fn(() => {}),
  },
};
jest.mock('./services', () => {
  const renderers: Record<string, unknown> = {
    test: {
      render: jest.fn((el: HTMLElement, value: unknown, handlers: IInterpreterRenderHandlers) => {
        handlers.done();
      }),
    },
  };

  return {
    getRenderersRegistry: jest.fn(() => ({
      get: jest.fn((id: string) => renderers[id]),
    })),
    getNotifications: jest.fn(() => {
      return mockNotificationService;
    }),
    getUiActions: jest.fn(),
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

  describe('handlers', () => {
    describe('event', () => {
      let handler: ExpressionRenderHandler;
      let handlers: IInterpreterRenderHandlers;
      let trigger: jest.Mocked<ReturnType<UiActionsStart['getTrigger']>>;
      let uiActions: jest.Mocked<UiActionsStart>;

      beforeEach(() => {
        jest.clearAllMocks();

        uiActions = uiActionsPluginMock.createStartContract();
        trigger = { exec: jest.fn() } as unknown as typeof trigger;
        handler = new ExpressionRenderHandler(element);
        handler.render({ type: 'render', as: 'test' });
        const renderer = getRenderersRegistry().get('test') as jest.Mocked<ExpressionRenderer>;
        [[, , handlers]] = renderer?.render.mock.calls;

        (getUiActions as jest.MockedFunction<typeof getUiActions>).mockReturnValue(uiActions);
        uiActions.getTrigger.mockReturnValueOnce(trigger);
      });

      it('should prevent the default behavior', () => {
        handler.events$.subscribe((event) => {
          event.preventDefault();
        });
        handlers.event({ name: 'click' });

        expect(uiActions.hasTrigger).not.toHaveBeenCalled();
      });

      it('should not execute a trigger if not present', () => {
        uiActions.hasTrigger.mockReturnValueOnce(false);
        handlers.event({ name: 'click' });

        expect(uiActions.getTrigger).not.toHaveBeenCalled();
      });

      it('should execute a trigger', () => {
        uiActions.hasTrigger.mockReturnValueOnce(true);
        handlers.event({ name: 'click', data: { something: 'kibana' } });

        expect(uiActions.getTrigger).toHaveBeenCalledTimes(1);
        expect(uiActions.getTrigger).toHaveBeenCalledWith('click');
        expect(trigger.exec).toHaveBeenCalledWith(expect.objectContaining({ something: 'kibana' }));
      });
    });
  });
});
