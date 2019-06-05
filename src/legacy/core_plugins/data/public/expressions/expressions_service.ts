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

import { Ast } from '@kbn/interpreter/common';

// TODO:
// this type import and the types below them should be switched to the types of
// the interpreter plugin itself once they are ready
import { Registry } from '@kbn/interpreter/common';
import { Adapters } from 'ui/inspector';
import { Query, Filters, TimeRange } from 'ui/embeddable';
import { createRenderer } from './expression_renderer';
import { createRunFn } from './expression_runner';

export interface InitialContextObject {
  timeRange?: TimeRange;
  filters?: Filters;
  query?: Query;
}

export type getInitialContextFunction = () => InitialContextObject;

export interface Handlers {
  getInitialContext: getInitialContextFunction;
  inspectorAdapters?: Adapters;
}

type Context = object;
export interface Result {
  type: string;
  as?: string;
  value?: unknown;
  error?: unknown;
}

interface RenderHandlers {
  done: () => void;
  onDestroy: (fn: () => void) => void;
}

export interface RenderFunction {
  name: string;
  displayName: string;
  help: string;
  validate: () => void;
  reuseDomNode: boolean;
  render: (domNode: Element, data: unknown, handlers: RenderHandlers) => void;
}

export type RenderFunctionsRegistry = Registry<unknown, RenderFunction>;

export interface Interpreter {
  interpretAst(ast: Ast, context: Context, handlers: Handlers): Promise<Result>;
}

type InterpreterGetter = () => Promise<{ interpreter: Interpreter }>;

export interface ExpressionsServiceDependencies {
  interpreter: {
    renderersRegistry: RenderFunctionsRegistry;
    getInterpreter: InterpreterGetter;
  };
}

/**
 * Expressions Service
 * @internal
 */
export class ExpressionsService {
  public setup({
    interpreter: { renderersRegistry, getInterpreter },
  }: ExpressionsServiceDependencies) {
    const run = createRunFn(
      renderersRegistry,
      getInterpreter().then(({ interpreter }) => interpreter)
    );

    return {
      /**
       * **experimential** This API is experimential and might be removed in the future
       * without notice
       *
       * Executes the given expression string or ast and renders the result into the
       * given DOM element.
       *
       *
       * @param expressionOrAst
       * @param element
       */
      run,
      /**
       * **experimential** This API is experimential and might be removed in the future
       * without notice
       *
       * Component which executes and renders the given expression in a div element.
       * The expression is re-executed on updating the props.
       *
       * This is a React bridge of the `run` method
       * @param props
       */
      ExpressionRenderer: createRenderer(run),
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type ExpressionsSetup = ReturnType<ExpressionsService['setup']>;
