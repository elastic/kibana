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

import { first } from 'rxjs/operators';
import { loader, ExpressionLoader } from './loader';
import { fromExpression } from '@kbn/interpreter/common';
import { IInterpreterRenderHandlers } from './_types';
import { Observable } from 'rxjs';
import { ExpressionAST } from '../../../../../../plugins/data/common/expressions/types';

const element: HTMLElement = null as any;

jest.mock('../services', () => ({
  getInterpreter: () => {
    return {
      interpretAst: async (expression: ExpressionAST) => {
        return { type: 'render', as: 'test' };
      },
    };
  },
}));

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

describe('execute helper function', () => {
  it('returns ExpressionDataHandler instance', () => {
    const response = loader(element, '', {});
    expect(response).toBeInstanceOf(ExpressionLoader);
  });
});

describe('ExpressionDataHandler', () => {
  const expressionString = '';

  describe('constructor', () => {
    it('accepts expression string', () => {
      const expressionDataHandler = new ExpressionLoader(element, expressionString, {});
      expect(expressionDataHandler.getExpression()).toEqual(expressionString);
    });

    it('accepts expression AST', () => {
      const expressionAST = fromExpression(expressionString) as ExpressionAST;
      const expressionDataHandler = new ExpressionLoader(element, expressionAST, {});
      expect(expressionDataHandler.getExpression()).toEqual(expressionString);
      expect(expressionDataHandler.getAst()).toEqual(expressionAST);
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
    const expressionLoader = new ExpressionLoader(element, expressionString, {});
    const response = await expressionLoader.data$.pipe(first()).toPromise();
    expect(response).toEqual({ type: 'render', as: 'test' });
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
    expressionLoader.update('', {});
    response = await expressionLoader.render$.pipe(first()).toPromise();
    expect(response).toBe(2);
  });

  it('cancel() aborts request', () => {
    const expressionDataHandler = new ExpressionLoader(element, expressionString, {});
    expressionDataHandler.cancel();
  });

  it('inspect() returns correct inspector adapters', () => {
    const expressionDataHandler = new ExpressionLoader(element, expressionString, {});
    expect(expressionDataHandler.inspect()).toHaveProperty('data');
    expect(expressionDataHandler.inspect()).toHaveProperty('requests');
  });
});
