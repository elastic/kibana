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
import {
  AnyExpressionFunction,
  AnyExpressionType,
  ExpressionInterpretWithHandlers,
  ExpressionExecutor,
} from './types';
import { FunctionsRegistry, RenderFunctionsRegistry, TypesRegistry } from './registries';
import { Setup as InspectorSetup, Start as InspectorStart } from '../../inspector/public';
import { setCoreStart } from './services';
import { clog as clogFunction } from './functions/clog';
import { font as fontFunction } from './functions/font';
import { kibana as kibanaFunction } from './functions/kibana';
import { kibanaContext as kibanaContextFunction } from './functions/kibana_context';
import {
  boolean as booleanType,
  datatable as datatableType,
  error as errorType,
  filter as filterType,
  image as imageType,
  nullType,
  number as numberType,
  pointseries,
  range as rangeType,
  render as renderType,
  shape as shapeType,
  string as stringType,
  style as styleType,
  kibanaContext as kibanaContextType,
  kibanaDatatable as kibanaDatatableType,
} from './expression_types';
import { interpreterProvider } from './interpreter_provider';
import { createHandlers } from './create_handlers';

export interface ExpressionsSetupDeps {
  inspector: InspectorSetup;
}

export interface ExpressionsStartDeps {
  inspector: InspectorStart;
}

export interface ExpressionsSetup {
  registerFunction: (fn: AnyExpressionFunction | (() => AnyExpressionFunction)) => void;
  registerRenderer: (renderer: any) => void;
  registerType: (type: () => AnyExpressionType) => void;
  __LEGACY: {
    functions: FunctionsRegistry;
    renderers: RenderFunctionsRegistry;
    types: TypesRegistry;
    getExecutor: () => ExpressionExecutor;
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

    const registerFunction: ExpressionsSetup['registerFunction'] = fn => {
      functions.register(fn);
    };

    registerFunction(clogFunction);
    registerFunction(fontFunction);
    registerFunction(kibanaFunction);
    registerFunction(kibanaContextFunction);

    types.register(booleanType);
    types.register(datatableType);
    types.register(errorType);
    types.register(filterType);
    types.register(imageType);
    types.register(nullType);
    types.register(numberType);
    types.register(pointseries);
    types.register(rangeType);
    types.register(renderType);
    types.register(shapeType);
    types.register(stringType);
    types.register(styleType);
    types.register(kibanaContextType);
    types.register(kibanaDatatableType);

    // TODO: Refactor this function.
    const getExecutor = () => {
      const interpretAst: ExpressionInterpretWithHandlers = (ast, context, handlers) => {
        const interpret = interpreterProvider({
          types: types.toJS(),
          handlers: { ...handlers, ...createHandlers() },
          functions: functions.toJS(),
        });
        return interpret(ast, context);
      };
      const executor: ExpressionExecutor = { interpreter: { interpretAst } };
      return executor;
    };

    const setup: ExpressionsSetup = {
      registerFunction,
      registerRenderer: (renderer: any) => {
        renderers.register(renderer);
      },
      registerType: type => {
        types.register(type);
      },
      __LEGACY: {
        functions,
        renderers,
        types,
        getExecutor,
      },
    };

    return setup;
  }

  public start(core: CoreStart, { inspector }: ExpressionsStartDeps): ExpressionsStart {
    setCoreStart(core);
  }

  public stop() {}
}
