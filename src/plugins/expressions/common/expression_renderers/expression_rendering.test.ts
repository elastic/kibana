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

import { RenderError } from './expression_rendering';
import { Observable } from 'rxjs';
import { first, take, toArray } from 'rxjs/operators';
import { IInterpreterRenderHandlers } from './types';
import {
  ExpressionsService,
  ExpressionsCreateRenderingParams,
} from '../service/expressions_services';

const setup = (params: ExpressionsCreateRenderingParams) => {
  const service = new ExpressionsService();
  const rendering = service.createRendering(params);

  return { service, rendering };
};

const element: HTMLElement = {} as HTMLElement;
const mockNotificationService = {
  toasts: {
    addError: jest.fn(() => {}),
  },
};

const mockMockErrorRenderFunction = jest.fn(
  (el: HTMLElement, error: RenderError, handlers: IInterpreterRenderHandlers) => handlers.done()
);
// extracts data from mockMockErrorRenderFunction call to assert in tests
const getHandledError = () => {
  try {
    return mockMockErrorRenderFunction.mock.calls[0][1];
  } catch (e) {
    return null;
  }
};

describe('ExpressionRendering', () => {
  it('constructor creates observers', () => {
    const { rendering } = setup({ element });
    expect(rendering.events$).toBeInstanceOf(Observable);
    expect(rendering.render$).toBeInstanceOf(Observable);
    expect(rendering.update$).toBeInstanceOf(Observable);
  });

  it('getElement returns the element', () => {
    const { rendering } = setup({ element });
    expect(rendering.getElement()).toBe(element);
  });

  describe('render()', () => {
    beforeEach(() => {
      mockMockErrorRenderFunction.mockClear();
      mockNotificationService.toasts.addError.mockClear();
    });

    it('in case of error render$ should emit when error renderer is finished', async () => {
      const { rendering } = setup({ element });
      rendering.render(false);
      const promise1 = rendering.render$.pipe(first()).toPromise();
      await expect(promise1).resolves.toEqual(1);

      rendering.render(false);
      const promise2 = rendering.render$.pipe(first()).toPromise();
      await expect(promise2).resolves.toEqual(2);
    });

    it('should use custom error handler if provided', async () => {
      const { rendering } = setup({
        element,
        onRenderError: mockMockErrorRenderFunction,
      });
      await rendering.render(false);
      expect(getHandledError()!.message).toEqual(
        `invalid data provided to the expression renderer`
      );
    });

    it('should throw error if the rendering function throws', async () => {
      const { service, rendering } = setup({
        element,
        onRenderError: mockMockErrorRenderFunction,
      });

      service.registerRenderer({
        displayName: 'something',
        name: 'something',
        reuseDomNode: false,
        render: (el, config, handlers) => {
          throw new Error('renderer error');
        },
      });

      await rendering.render({ type: 'render', as: 'something' });
      expect(getHandledError()!.message).toEqual('renderer error');
    });

    it('sends a next observable once rendering is complete', () => {
      const { rendering } = setup({ element });

      expect.assertions(1);

      return new Promise(resolve => {
        rendering.render$.subscribe(renderCount => {
          expect(renderCount).toBe(1);
          resolve();
        });

        rendering.render({ type: 'render', as: 'test' });
      });
    });

    // in case render$ subscription happen after render() got called
    // we still want to be notified about sync render$ updates
    it("doesn't swallow sync render errors", async () => {
      const { rendering } = setup({
        element,
        onRenderError: mockMockErrorRenderFunction,
      });
      rendering.render(false);
      const renderPromiseAfterRender = rendering.render$.pipe(first()).toPromise();
      await expect(renderPromiseAfterRender).resolves.toEqual(1);
      expect(getHandledError()!.message).toEqual(
        'invalid data provided to the expression renderer'
      );

      mockMockErrorRenderFunction.mockClear();

      const { rendering: rendering2 } = setup({
        element,
        onRenderError: mockMockErrorRenderFunction,
      });
      const renderPromiseBeforeRender = rendering2.render$.pipe(first()).toPromise();
      rendering2.render(false);
      await expect(renderPromiseBeforeRender).resolves.toEqual(1);
      expect(getHandledError()!.message).toEqual(
        'invalid data provided to the expression renderer'
      );
    });

    // it is expected side effect of using BehaviorSubject for render$,
    // that observables will emit previous result if subscription happens after render
    it('should emit previous render and error results', async () => {
      const { rendering } = setup({ element });
      rendering.render(false);
      const renderPromise = rendering.render$
        .pipe(take(2), toArray())
        .toPromise()
        .catch(() => {});
      rendering.render(false);
      await expect(renderPromise).resolves.toEqual([1, 2]);
    });
  });
});
