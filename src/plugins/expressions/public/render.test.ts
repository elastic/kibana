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

import { render, ExpressionRenderHandler } from './render';
import { Observable } from 'rxjs';
import { IInterpreterRenderHandlers } from './types';
import { getRenderersRegistry } from './services';
import { first } from 'rxjs/operators';

const element: HTMLElement = {} as HTMLElement;

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
  };
});

describe('render helper function', () => {
  it('returns ExpressionRenderHandler instance', () => {
    const response = render(element, {});
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
    it('sends an observable error and keeps it open if invalid data is provided', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      const promise1 = expressionRenderHandler.render$.pipe(first()).toPromise();
      expressionRenderHandler.render(false);
      await expect(promise1).resolves.toEqual({
        type: 'error',
        error: {
          message: 'invalid data provided to the expression renderer',
        },
      });

      const promise2 = expressionRenderHandler.render$.pipe(first()).toPromise();
      expressionRenderHandler.render(false);
      await expect(promise2).resolves.toEqual({
        type: 'error',
        error: {
          message: 'invalid data provided to the expression renderer',
        },
      });
    });

    it('sends an observable error if renderer does not exist', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      const promise = expressionRenderHandler.render$.pipe(first()).toPromise();
      expressionRenderHandler.render({ type: 'render', as: 'something' });
      await expect(promise).resolves.toEqual({
        type: 'error',
        error: {
          message: `invalid renderer id 'something'`,
        },
      });
    });

    it('sends an observable error if the rendering function throws', async () => {
      (getRenderersRegistry as jest.Mock).mockReturnValueOnce({ get: () => true });
      (getRenderersRegistry as jest.Mock).mockReturnValueOnce({
        get: () => ({
          render: () => {
            throw new Error('renderer error');
          },
        }),
      });

      const expressionRenderHandler = new ExpressionRenderHandler(element);
      const promise = expressionRenderHandler.render$.pipe(first()).toPromise();
      expressionRenderHandler.render({ type: 'render', as: 'something' });
      await expect(promise).resolves.toEqual({
        type: 'error',
        error: {
          message: 'renderer error',
        },
      });
    });

    it('sends a next observable once rendering is complete', () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      expect.assertions(1);
      return new Promise(resolve => {
        expressionRenderHandler.render$.subscribe(renderCount => {
          expect(renderCount).toBe(1);
          resolve();
        });

        expressionRenderHandler.render({ type: 'render', as: 'test' });
      });
    });
  });
});
