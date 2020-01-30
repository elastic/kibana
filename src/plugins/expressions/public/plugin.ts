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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ExpressionInterpretWithHandlers, ExpressionExecutor } from './types';
import {
  Executor,
  ExpressionRendererRegistry,
  FunctionsRegistry,
  serializeProvider,
  TypesRegistry,
  ExpressionFunction,
} from '../common';
import { Setup as InspectorSetup, Start as InspectorStart } from '../../inspector/public';
import { BfetchPublicSetup, BfetchPublicStart } from '../../bfetch/public';
import {
  setCoreStart,
  setInspector,
  setInterpreter,
  setRenderersRegistry,
  setNotifications,
} from './services';
import { kibanaContext as kibanaContextFunction } from './expression_functions/kibana_context';
import { interpreterProvider } from './interpreter_provider';
import { createHandlers } from './create_handlers';
import { ExpressionRendererImplementation } from './expression_renderer';
import { ExpressionLoader, loader } from './loader';
import { ExpressionDataHandler, execute } from './execute';
import { render, ExpressionRenderHandler } from './render';

export interface ExpressionsSetupDeps {
  bfetch: BfetchPublicSetup;
  inspector: InspectorSetup;
}

export interface ExpressionsStartDeps {
  bfetch: BfetchPublicStart;
  inspector: InspectorStart;
}

export interface ExpressionsSetup {
  registerType: Executor['registerType'];
  registerFunction: Executor['registerFunction'];
  registerRenderer: ExpressionRendererRegistry['register'];
  getFunctions: () => Record<string, ExpressionFunction>;
  __LEGACY: {
    types: TypesRegistry;
    functions: FunctionsRegistry;
    renderers: ExpressionRendererRegistry;
    getExecutor: () => ExpressionExecutor;
    loadLegacyServerFunctionWrappers: () => Promise<void>;
  };
}

export interface ExpressionsStart {
  execute: typeof execute;
  ExpressionDataHandler: typeof ExpressionDataHandler;
  ExpressionLoader: typeof ExpressionLoader;
  ExpressionRenderer: typeof ExpressionRendererImplementation;
  ExpressionRenderHandler: typeof ExpressionRenderHandler;
  loader: typeof loader;
  render: typeof render;
}

export class ExpressionsPublicPlugin
  implements
    Plugin<ExpressionsSetup, ExpressionsStart, ExpressionsSetupDeps, ExpressionsStartDeps> {
  private readonly executor: Executor = new Executor();
  private readonly renderers: ExpressionRendererRegistry = new ExpressionRendererRegistry();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { inspector, bfetch }: ExpressionsSetupDeps): ExpressionsSetup {
    const { executor, renderers } = this;

    executor.extendContext({
      environment: 'client',
    });
    executor.registerFunction(kibanaContextFunction());

    setRenderersRegistry(renderers);

    const registerFunction = executor.registerFunction.bind(executor);
    const registerType = executor.registerType.bind(executor);
    const registerRenderer = renderers.register.bind(renderers);

    const getFunctions: ExpressionsSetup['getFunctions'] = () => executor.getFunctions();

    // TODO: Refactor this function.
    const getExecutor = () => {
      const interpretAst: ExpressionInterpretWithHandlers = (ast, input, extraContext?) =>
        executor.run(ast, input, extraContext);
      return { interpreter: { interpretAst } } as ExpressionExecutor;
    };

    setInterpreter(getExecutor().interpreter);

    let cached: Promise<void> | null = null;
    const loadLegacyServerFunctionWrappers = async () => {
      if (!cached) {
        cached = (async () => {
          const serverFunctionList = await core.http.get(`/api/interpreter/fns`);
          const batchedFunction = bfetch.batchedFunction({ url: `/api/interpreter/fns` });
          const { serialize } = serializeProvider(executor.getTypes());

          // For every sever-side function, register a client-side
          // function that matches its definition, but which simply
          // calls the server-side function endpoint.
          Object.keys(serverFunctionList).forEach(functionName => {
            const fn = () => ({
              ...serverFunctionList[functionName],
              fn: (context: any, args: any) => {
                return batchedFunction({ functionName, args, context: serialize(context) });
              },
            });
            registerFunction(fn);
          });
        })();
      }
      return cached;
    };

    const setup: ExpressionsSetup = {
      registerFunction,
      registerRenderer,
      registerType,
      getFunctions,
      __LEGACY: {
        types: executor.types,
        functions: executor.functions,
        renderers,
        getExecutor,
        loadLegacyServerFunctionWrappers,
      },
    };

    return setup;
  }

  public start(core: CoreStart, { inspector, bfetch }: ExpressionsStartDeps): ExpressionsStart {
    setCoreStart(core);
    setInspector(inspector);
    setNotifications(core.notifications);

    return {
      execute,
      ExpressionDataHandler,
      ExpressionLoader,
      ExpressionRenderer: ExpressionRendererImplementation,
      ExpressionRenderHandler,
      loader,
      render,
    };
  }

  public stop() {}
}
