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
import { ExpressionsSetupContract } from '../../../../../../plugins/expressions/public/expressions/expressions_service';
/* eslint-enable */

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
import { IInterpreter } from './types';
import { setInterpreter, setInspector, setRenderersRegistry } from './services';
import { createRenderer } from './expression_renderer';
import { loader } from './loader';
import { execute } from './execute';
import { render } from './render';

export interface ExpressionsSetupDeps {
  inspector: InspectorSetup;
}

export interface ExpressionsStartDeps {
  inspector: InspectorStart;
}

export type ExpressionsSetup = ExpressionsSetupContract;
export type ExpressionsStart = ReturnType<ExpressionsPublicPlugin['start']>;

export class ExpressionsPublicPlugin
  implements
    Plugin<ExpressionsSetup, ExpressionsStart, ExpressionsSetupDeps, ExpressionsStartDeps> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ExpressionsSetupDeps): ExpressionsSetup {
    setRenderersRegistry(npSetup.plugins.expressions.__LEGACY.renderers);

    // eslint-disable-next-line
    const { getInterpreter } = require('../../../../interpreter/public/interpreter');
    getInterpreter()
      .then(({ interpreter }: { interpreter: IInterpreter }) => {
        setInterpreter(interpreter);
      })
      .catch((e: Error) => {
        throw new Error('interpreter is not initialized');
      });

    return {
      registerType: npSetup.plugins.expressions.registerType,
      registerFunction: npSetup.plugins.expressions.registerFunction,
      registerRenderer: npSetup.plugins.expressions.registerRenderer,
      __LEGACY: npSetup.plugins.expressions.__LEGACY,
    };
  }

  public start(core: CoreStart, { inspector }: ExpressionsStartDeps) {
    const ExpressionRenderer = createRenderer(loader);
    setInspector(inspector);

    return {
      execute,
      render,
      loader,
      ExpressionRenderer,
    };
  }

  public stop() {}
}
