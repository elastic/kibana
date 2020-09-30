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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import {
  ExpressionsService,
  ExpressionsServiceSetup,
  ExpressionsServiceStart,
  ExecutionContext,
} from '../common';
import { setRenderersRegistry, setNotifications, setExpressionsService } from './services';
import { ReactExpressionRenderer } from './react_expression_renderer';
import { ExpressionLoader, loader } from './loader';
import { render, ExpressionRenderHandler } from './render';

export type ExpressionsSetup = ExpressionsServiceSetup;

export interface ExpressionsStart extends ExpressionsServiceStart {
  ExpressionLoader: typeof ExpressionLoader;
  ExpressionRenderHandler: typeof ExpressionRenderHandler;
  loader: typeof loader;
  ReactExpressionRenderer: typeof ReactExpressionRenderer;
  render: typeof render;
}

export class ExpressionsPublicPlugin implements Plugin<ExpressionsSetup, ExpressionsStart> {
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

  public setup(core: CoreSetup): ExpressionsSetup {
    this.configureExecutor(core);

    const { expressions } = this;
    const { renderers } = expressions;

    setRenderersRegistry(renderers);
    setExpressionsService(expressions);

    const setup = expressions.setup();

    return Object.freeze(setup);
  }

  public start(core: CoreStart): ExpressionsStart {
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
