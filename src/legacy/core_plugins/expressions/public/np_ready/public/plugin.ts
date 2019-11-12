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

/* eslint-disable */
import { npSetup } from 'ui/new_platform';
/* eslint-enable */

import { ExpressionsSetup } from '../../../../../../plugins/expressions/public';

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../../../core/public';
import {
  Start as InspectorStart,
  Setup as InspectorSetup,
} from '../../../../../../plugins/inspector/public';
// eslint-disable-next-line
import { ExpressionRendererImplementation } from '../../../../../../plugins/expressions/public/expression_renderer';
// eslint-disable-next-line
import { ExpressionLoader, loader } from '../../../../../../plugins/expressions/public/loader';
// eslint-disable-next-line
import { ExpressionDataHandler, execute } from '../../../../../../plugins/expressions/public/execute';
// eslint-disable-next-line
import { render, ExpressionRenderHandler } from '../../../../../../plugins/expressions/public/render';

export interface ExpressionsSetupDeps {
  inspector: InspectorSetup;
}

export interface ExpressionsStartDeps {
  inspector: InspectorStart;
}

export { ExpressionsSetup };
export type ExpressionsStart = ReturnType<ExpressionsPublicPlugin['start']>;

export class ExpressionsPublicPlugin
  implements
    Plugin<ExpressionsSetup, ExpressionsStart, ExpressionsSetupDeps, ExpressionsStartDeps> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ExpressionsSetupDeps): ExpressionsSetup {
    return npSetup.plugins.expressions;
  }

  public start(core: CoreStart, { inspector }: ExpressionsStartDeps) {
    return {
      execute,
      render,
      loader,
      ExpressionRenderer: ExpressionRendererImplementation,
      ExpressionDataHandler,
      ExpressionRenderHandler,
      ExpressionLoader,
    };
  }

  public stop() {}
}
