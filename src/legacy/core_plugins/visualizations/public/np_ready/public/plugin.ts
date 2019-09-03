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

import { FiltersService, FiltersSetup } from './filters';
import { TypesService, TypesSetup } from './types';
import { VisTypeAliasRegistry } from './types/vis_type_alias_registry';

interface SetupDependencies {
  __LEGACY: {
    VisFiltersProvider: any;
    createFilter: any;

    Vis: any;
    VisFactoryProvider: any;
    VisTypesRegistryProvider: any;
    defaultFeedbackMessage: any;
    visTypeAliasRegistry: VisTypeAliasRegistry;
  };
}

export interface Setup {
  filters: FiltersSetup;
  types: TypesSetup;
}

export type Start = void;

export class VisualizationsPublicPlugin implements Plugin<Setup, Start, SetupDependencies, {}> {
  private readonly filters: FiltersService;
  private readonly types: TypesService;

  constructor(initializerContext: PluginInitializerContext) {
    this.filters = new FiltersService();
    this.types = new TypesService();
  }

  public setup(core: CoreSetup, { __LEGACY }: SetupDependencies) {
    const {
      VisFiltersProvider,
      createFilter,
      Vis,
      VisFactoryProvider,
      VisTypesRegistryProvider,
      defaultFeedbackMessage,
      visTypeAliasRegistry,
    } = __LEGACY;

    return {
      filters: this.filters.setup({
        VisFiltersProvider,
        createFilter,
      }),
      types: this.types.setup({
        Vis,
        VisFactoryProvider,
        VisTypesRegistryProvider,
        defaultFeedbackMessage,
        visTypeAliasRegistry,
      }),
    };
  }

  public start(core: CoreStart) {
    // Do nothing yet...
  }

  public stop() {
    this.filters.stop();
    this.types.stop();
  }
}
