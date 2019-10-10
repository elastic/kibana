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
import { AnyExpressionFunction, AnyExpressionType } from './types';
import { FunctionsRegistry, RenderFunctionsRegistry, TypesRegistry } from './registries';
import { Setup as InspectorSetup, Start as InspectorStart } from '../../inspector/public';
import { setCoreStart } from './services';
import { clog as clogFunction } from './functions/clog';
import { font as fontFunction } from './functions/font';
import { kibanaContext as kibanaContextFunction } from './functions/kibana_context';

export interface ExpressionsSetupDeps {
  inspector: InspectorSetup;
}

export interface ExpressionsStartDeps {
  inspector: InspectorStart;
}

export interface ExpressionsSetup {
  registerFunction: (fn: () => AnyExpressionFunction) => void;
  registerRenderer: (renderer: any) => void;
  registerType: (type: () => AnyExpressionType) => void;
  __LEGACY: {
    functions: FunctionsRegistry;
    renderers: RenderFunctionsRegistry;
    types: TypesRegistry;
  };
}

export type ExpressionsStart = void;

export class ExpressionsPublicPlugin
  implements
    Plugin<ExpressionsSetup, ExpressionsStart, ExpressionsSetupDeps, ExpressionsStartDeps> {
  private readonly functions = new FunctionsRegistry();
  private readonly renderers = new RenderFunctionsRegistry();
  private readonly types = new TypesRegistry();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { inspector }: ExpressionsSetupDeps): ExpressionsSetup {
    const { functions, renderers, types } = this;

    this.functions.register(clogFunction);
    this.functions.register(fontFunction);
    this.functions.register(kibanaContextFunction);

    const setup: ExpressionsSetup = {
      registerFunction: fn => {
        this.functions.register(fn);
      },
      registerRenderer: (renderer: any) => {
        this.renderers.register(renderer);
      },
      registerType: type => {
        this.types.register(type);
      },
      __LEGACY: {
        functions,
        renderers,
        types,
      },
    };

    return setup;
  }

  public start(core: CoreStart, { inspector }: ExpressionsStartDeps): ExpressionsStart {
    setCoreStart(core);
  }

  public stop() {}
}
