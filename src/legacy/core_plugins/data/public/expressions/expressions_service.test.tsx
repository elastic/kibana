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

import { fromExpression, Ast } from '@kbn/interpreter/common';

import {
  ExpressionsService,
  RenderFunctionsRegistry,
  RenderFunction,
  Interpreter,
  ExpressionsServiceDependencies,
  Result,
  ExpressionsSetup,
} from './expressions_service';
import { mount } from 'enzyme';
import React from 'react';

const waitForInterpreterRun = async () => {
  // Wait for two ticks with empty callback queues
  // This makes sure the runFn promise and actual interpretAst
  // promise have been resolved and processed
  await new Promise(resolve => setTimeout(resolve));
  await new Promise(resolve => setTimeout(resolve));
};

const RENDERER_ID = 'mockId';

describe('expressions_service', () => {
  let interpretAstMock: jest.Mocked<Interpreter>['interpretAst'];
  let interpreterMock: jest.Mocked<Interpreter>;
  let renderFunctionMock: jest.Mocked<RenderFunction>;
  let setupPluginsMock: ExpressionsServiceDependencies;
  const expressionResult: Result = { type: 'render', as: RENDERER_ID, value: {} };

  let api: ExpressionsSetup;
  let testExpression: string;
  let testAst: Ast;

  beforeEach(() => {
    interpretAstMock = jest.fn(_ => Promise.resolve(expressionResult));
    interpreterMock = { interpretAst: interpretAstMock };
    renderFunctionMock = ({
      render: jest.fn(),
    } as unknown) as jest.Mocked<RenderFunction>;
    setupPluginsMock = {
      interpreter: {
        getInterpreter: () => Promise.resolve({ interpreter: interpreterMock }),
        renderersRegistry: ({
          get: (id: string) => (id === RENDERER_ID ? renderFunctionMock : null),
        } as unknown) as RenderFunctionsRegistry,
      },
    };
    api = new ExpressionsService().setup(setupPluginsMock);
    testExpression = 'test | expression';
    testAst = fromExpression(testExpression);
  });

  describe('expression_runner', () => {
    it('should return run function', () => {
      expect(typeof api.run).toBe('function');
    });

    it('should call the interpreter with parsed expression', async () => {
      await api.run(testExpression, { element: document.createElement('div') });
      expect(interpreterMock.interpretAst).toHaveBeenCalledWith(
        testAst,
        expect.anything(),
        expect.anything()
      );
    });

    it('should call the interpreter with given context and getInitialContext functions', async () => {
      const getInitialContext = () => ({});
      const context = {};

      await api.run(testExpression, { getInitialContext, context });
      const interpretCall = interpreterMock.interpretAst.mock.calls[0];

      expect(interpretCall[1]).toBe(context);
      expect(interpretCall[2].getInitialContext).toBe(getInitialContext);
    });

    it('should call the interpreter with passed in ast', async () => {
      await api.run(testAst, { element: document.createElement('div') });
      expect(interpreterMock.interpretAst).toHaveBeenCalledWith(
        testAst,
        expect.anything(),
        expect.anything()
      );
    });

    it('should return the result of the interpreter run', async () => {
      const response = await api.run(testAst, {});
      expect(response).toBe(expressionResult);
    });

    it('should reject the promise if the response is not renderable but an element is passed', async () => {
      const unexpectedResult = { type: 'datatable', value: {} };
      interpretAstMock.mockReturnValue(Promise.resolve(unexpectedResult));
      expect(
        api.run(testAst, {
          element: document.createElement('div'),
        })
      ).rejects.toBe(unexpectedResult);
    });

    it('should reject the promise if the renderer is not known', async () => {
      const unexpectedResult = { type: 'render', as: 'unknown_id' };
      interpretAstMock.mockReturnValue(Promise.resolve(unexpectedResult));
      expect(
        api.run(testAst, {
          element: document.createElement('div'),
        })
      ).rejects.toBe(unexpectedResult);
    });

    it('should not reject the promise on unknown renderer if the runner is not rendering', async () => {
      const unexpectedResult = { type: 'render', as: 'unknown_id' };
      interpretAstMock.mockReturnValue(Promise.resolve(unexpectedResult));
      expect(api.run(testAst, {})).resolves.toBe(unexpectedResult);
    });

    it('should reject the promise if the response is an error', async () => {
      const errorResult = { type: 'error', error: {} };
      interpretAstMock.mockReturnValue(Promise.resolve(errorResult));
      expect(api.run(testAst, {})).rejects.toBe(errorResult);
    });

    it('should reject the promise if there are syntax errors', async () => {
      expect(api.run('|||', {})).rejects.toBeInstanceOf(Error);
    });

    it('should call the render function with the result and element', async () => {
      const element = document.createElement('div');

      await api.run(testAst, { element });
      expect(renderFunctionMock.render).toHaveBeenCalledWith(
        element,
        expressionResult.value,
        expect.anything()
      );
      expect(interpreterMock.interpretAst).toHaveBeenCalledWith(
        testAst,
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('expression_renderer', () => {
    it('should call interpreter and render function when called through react component', async () => {
      const ExpressionRenderer = api.ExpressionRenderer;

      mount(<ExpressionRenderer expression={testExpression} />);

      await waitForInterpreterRun();

      expect(renderFunctionMock.render).toHaveBeenCalledWith(
        expect.any(Element),
        expressionResult.value,
        expect.anything()
      );
      expect(interpreterMock.interpretAst).toHaveBeenCalledWith(
        testAst,
        expect.anything(),
        expect.anything()
      );
    });

    it('should call the interpreter with given context and getInitialContext functions', async () => {
      const getInitialContext = () => ({});
      const context = {};

      const ExpressionRenderer = api.ExpressionRenderer;

      mount(
        <ExpressionRenderer
          expression={testExpression}
          getInitialContext={getInitialContext}
          context={context}
        />
      );

      await waitForInterpreterRun();

      const interpretCall = interpreterMock.interpretAst.mock.calls[0];

      expect(interpretCall[1]).toBe(context);
      expect(interpretCall[2].getInitialContext).toBe(getInitialContext);
    });

    it('should call interpreter and render function again if expression changes', async () => {
      const ExpressionRenderer = api.ExpressionRenderer;

      const instance = mount(<ExpressionRenderer expression={testExpression} />);

      await waitForInterpreterRun();

      expect(renderFunctionMock.render).toHaveBeenCalledWith(
        expect.any(Element),
        expressionResult.value,
        expect.anything()
      );
      expect(interpreterMock.interpretAst).toHaveBeenCalledWith(
        testAst,
        expect.anything(),
        expect.anything()
      );

      instance.setProps({ expression: 'supertest | expression ' });

      await waitForInterpreterRun();

      expect(renderFunctionMock.render).toHaveBeenCalledTimes(2);
      expect(interpreterMock.interpretAst).toHaveBeenCalledTimes(2);
    });

    it('should not call interpreter and render function again if expression does not change', async () => {
      const ast = fromExpression(testExpression);

      const ExpressionRenderer = api.ExpressionRenderer;

      const instance = mount(<ExpressionRenderer expression={testExpression} />);

      await waitForInterpreterRun();

      expect(renderFunctionMock.render).toHaveBeenCalledWith(
        expect.any(Element),
        expressionResult.value,
        expect.anything()
      );
      expect(interpreterMock.interpretAst).toHaveBeenCalledWith(
        ast,
        expect.anything(),
        expect.anything()
      );

      instance.update();

      await waitForInterpreterRun();

      expect(renderFunctionMock.render).toHaveBeenCalledTimes(1);
      expect(interpreterMock.interpretAst).toHaveBeenCalledTimes(1);
    });

    it('should call onRenderFailure if the result can not be rendered', async () => {
      const errorResult = { type: 'error', error: {} };
      interpretAstMock.mockReturnValue(Promise.resolve(errorResult));
      const renderFailureSpy = jest.fn();

      const ExpressionRenderer = api.ExpressionRenderer;

      mount(<ExpressionRenderer expression={testExpression} onRenderFailure={renderFailureSpy} />);

      await waitForInterpreterRun();

      expect(renderFailureSpy).toHaveBeenCalledWith(errorResult);
    });
  });
});
