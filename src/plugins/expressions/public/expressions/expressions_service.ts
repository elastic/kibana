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

import { FunctionsRegistry, RenderFunctionsRegistry, TypesRegistry } from './interpreter';
import { ExpressionType } from '../../common/expressions/types';

export interface ExpressionsSetupContract {
  registerFunction: (fn: any) => void;
  registerRenderer: (renderer: any) => void;
  registerType: (type: () => ExpressionType<any, any>) => void;
  __LEGACY: {
    functions: FunctionsRegistry;
    renderers: RenderFunctionsRegistry;
    types: TypesRegistry;
  };
}

export type ExpressionsStartContract = ExpressionsSetupContract;

export class ExpressionsService {
  private readonly functions = new FunctionsRegistry();
  private readonly renderers = new RenderFunctionsRegistry();
  private readonly types = new TypesRegistry();

  private setupApi!: ExpressionsSetupContract;

  public setup() {
    const { functions, renderers, types } = this;

    this.setupApi = {
      registerFunction: (fn: any) => {
        this.functions.register(fn);
      },
      registerRenderer: (renderer: any) => {
        this.renderers.register(renderer);
      },
      registerType: (type: () => ExpressionType<any, any>) => {
        this.types.register(type);
      },
      __LEGACY: {
        functions,
        renderers,
        types,
      },
    };

    return this.setupApi;
  }

  public start(): ExpressionsStartContract {
    return this.setupApi as ExpressionsStartContract;
  }
}
