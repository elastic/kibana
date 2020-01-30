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
import { ExpressionExecutor } from './types';
import {
  Executor,
  ExpressionRendererRegistry,
  FunctionsRegistry,
  serializeProvider,
  TypesRegistry,
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
  getFunctions: Executor['getFunctions'];
  registerFunction: Executor['registerFunction'];
  registerRenderer: ExpressionRendererRegistry['register'];
  registerType: Executor['registerType'];
  run: Executor['run'];
  __LEGACY: {
    types: TypesRegistry;
    functions: FunctionsRegistry;
    renderers: ExpressionRendererRegistry;
    getExecutor: () => ExpressionExecutor;
    loadLegacyServerFunctionWrappers: () => Promise<void>;
  };
}

export interface ExpressionsStart {
  getFunctions: Executor['getFunctions'];
  run: Executor['run'];
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
  private readonly executor: Executor = Executor.createWithDefaults();
  private readonly renderers: ExpressionRendererRegistry = new ExpressionRendererRegistry();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { inspector, bfetch }: ExpressionsSetupDeps): ExpressionsSetup {
    const { executor, renderers } = this;

    executor.extendContext({
      environment: 'client',
    });
    executor.registerFunction(kibanaContextFunction());

    setRenderersRegistry(renderers);

    const getFunctions = executor.getFunctions.bind(executor);
    const registerFunction = executor.registerFunction.bind(executor);
    const registerRenderer = renderers.register.bind(renderers);
    const registerType = executor.registerType.bind(executor);
    const run = executor.run.bind(executor);

    // This is legacy. Should go away when we get rid of __LEGACY.
    const getExecutor = (): ExpressionExecutor => {
      return { interpreter: { interpretAst: run } };
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
      getFunctions,
      registerFunction,
      registerRenderer,
      registerType,
      run,
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

    const { executor } = this;

    const getFunctions = executor.getFunctions.bind(executor);
    const run = executor.run.bind(executor);

    return {
      execute,
      ExpressionDataHandler,
      ExpressionLoader,
      ExpressionRenderer: ExpressionRendererImplementation,
      ExpressionRenderHandler,
      getFunctions,
      loader,
      render,
      run,
    };
  }

  public stop() {}
}
