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
import { IInterpreterRenderHandlers } from './_types';

const element: HTMLElement = null as any;

jest.mock('../../../../interpreter/public/registries', () => {
  const _registry: Record<string, any> = {};
  _registry.test = {
    render: (el: HTMLElement, value: any, handlers: IInterpreterRenderHandlers) => {
      handlers.done();
    },
  };
  return {
    renderersRegistry: {
      get: (id: string) => {
        return _registry[id];
      },
    },
  };
});

describe('render helper function', () => {
  it('returns ExpressionRenderHandler instance', () => {
    const response = render(element, {});
    expect(response).toBeInstanceOf(ExpressionRenderHandler);
  });
});

describe('ExpressionRenderHandler', () => {
  const data = { type: 'render', as: 'test' };

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
    it('throws if invalid data is provided', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      await expect(expressionRenderHandler.render({})).rejects.toThrow();
    });

    it('throws if renderer does not exist', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      await expect(
        expressionRenderHandler.render({ type: 'render', as: 'something' })
      ).rejects.toThrow();
    });

    it('returns a promise', () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      expect(expressionRenderHandler.render(data)).toBeInstanceOf(Promise);
    });

    it('resolves a promise once rendering is complete', async () => {
      const expressionRenderHandler = new ExpressionRenderHandler(element);
      const response = await expressionRenderHandler.render(data);
      expect(response).toBe(1);
    });
  });
});
