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
  ExpressionRendererRegistry,
  FunctionsRegistry,
  serializeProvider,
  TypesRegistry,
  ExpressionsService,
  ExpressionsServiceSetup,
  ExpressionsServiceStart,
  ExecutionContext,
} from '../common';
import { BfetchPublicSetup, BfetchPublicStart } from '../../bfetch/public';
import {
  setCoreStart,
  setInterpreter,
  setRenderersRegistry,
  setNotifications,
  setExpressionsService,
} from './services';
import { ReactExpressionRenderer } from './react_expression_renderer';
import { ExpressionLoader, loader } from './loader';
import { render, ExpressionRenderHandler } from './render';

export interface ExpressionsSetupDeps {
  bfetch: BfetchPublicSetup;
}

export interface ExpressionsStartDeps {
  bfetch: BfetchPublicStart;
}

export interface ExpressionsSetup extends ExpressionsServiceSetup {
  /**
   * @todo Get rid of these `__LEGACY` APIs.
   *
   * `__LEGACY` APIs are used by Canvas. It should be possible to stop
   * using all of them (except `loadLegacyServerFunctionWrappers`) and use
   * Kibana Platform plugin contracts instead.
   */
  __LEGACY: {
    /**
     * Use `registerType` and `getTypes` instead.
     */
    types: TypesRegistry;

    /**
     * Use `registerFunction` and `getFunctions` instead.
     */
    functions: FunctionsRegistry;

    /**
     * Use `registerRenderer` and `getRenderers`, and `getRenderer` instead.
     */
    renderers: ExpressionRendererRegistry;

    /**
     * Use `run` function instead.
     */
    getExecutor: () => ExpressionExecutor;

    /**
     * This function is used by Canvas to load server-side function and create
     * browser-side "wrapper" for each one. This function can be removed once
     * we enable expressions on server-side: https://github.com/elastic/kibana/issues/46906
     */
    loadLegacyServerFunctionWrappers: () => Promise<void>;
  };
}

export interface ExpressionsStart extends ExpressionsServiceStart {
  ExpressionLoader: typeof ExpressionLoader;
  ExpressionRenderHandler: typeof ExpressionRenderHandler;
  loader: typeof loader;
  ReactExpressionRenderer: typeof ReactExpressionRenderer;
  render: typeof render;
}

export class ExpressionsPublicPlugin
  implements
    Plugin<ExpressionsSetup, ExpressionsStart, ExpressionsSetupDeps, ExpressionsStartDeps> {
  private readonly expressions: ExpressionsService = new ExpressionsService();

  constructor(initializerContext: PluginInitializerContext) {}

  private configureExecutor(core: CoreSetup) {
    const { executor } = this.expressions;

    const getSavedObject: ExecutionContext['getSavedObject'] = async (type, id) => {
      const [start] = await core.getStartServices();
      return start.savedObjects.client.get(type, id);
    };

    executor.extendContext({
      environment: 'client',
      getSavedObject,
    });
  }

  public setup(core: CoreSetup, { bfetch }: ExpressionsSetupDeps): ExpressionsSetup {
    this.configureExecutor(core);

    const { expressions } = this;
    const { executor, renderers } = expressions;

    setRenderersRegistry(renderers);
    setExpressionsService(this.expressions);

    const expressionsSetup = expressions.setup();

    // This is legacy. Should go away when we get rid of __LEGACY.
    const getExecutor = (): ExpressionExecutor => {
      return { interpreter: { interpretAst: expressionsSetup.run } };
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
          Object.keys(serverFunctionList).forEach((functionName) => {
            if (expressionsSetup.getFunction(functionName)) {
              return;
            }
            const fn = () => ({
              ...serverFunctionList[functionName],
              fn: (input: any, args: any) => {
                return batchedFunction({ functionName, args, context: serialize(input) });
              },
            });
            expressionsSetup.registerFunction(fn);
          });
        })();
      }
      return cached;
    };

    const setup: ExpressionsSetup = {
      ...expressionsSetup,
      __LEGACY: {
        types: executor.types,
        functions: executor.functions,
        renderers,
        getExecutor,
        loadLegacyServerFunctionWrappers,
      },
    };

    return Object.freeze(setup);
  }

  public start(core: CoreStart, { bfetch }: ExpressionsStartDeps): ExpressionsStart {
    setCoreStart(core);
    setNotifications(core.notifications);

    const { expressions } = this;
    const start = {
      ...expressions.start(),
      ExpressionLoader,
      ExpressionRenderHandler,
      loader,
      ReactExpressionRenderer,
      render,
    };

    return Object.freeze(start);
  }

  public stop() {
    this.expressions.stop();
  }
}
