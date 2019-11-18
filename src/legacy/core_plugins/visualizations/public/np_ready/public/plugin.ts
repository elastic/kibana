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
import { TypesService, TypesSetup, TypesStart } from './types';

/**
 * Interface for any dependencies on other plugins' contracts.
 *
 * @internal
 */
interface VisualizationsPluginSetupDependencies {
  __LEGACY: {
    VisFiltersProvider: any;
    createFilter: any;
  };
}

/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */
export interface VisualizationsSetup {
  filters: FiltersSetup;
  types: TypesSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizationsStart {
  types: TypesStart;
}

/**
 * Visualizations Plugin - public
 *
 * This plugin's stateful contracts are returned from the `setup` and `start` methods
 * below. The interfaces for these contracts are provided above.
 *
 * @internal
 */
export class VisualizationsPlugin
  implements
    Plugin<VisualizationsSetup, VisualizationsStart, VisualizationsPluginSetupDependencies> {
  private readonly filters: FiltersService = new FiltersService();
  private readonly types: TypesService = new TypesService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { __LEGACY }: VisualizationsPluginSetupDependencies) {
    const { VisFiltersProvider, createFilter } = __LEGACY;

    return {
      filters: this.filters.setup({
        VisFiltersProvider,
        createFilter,
      }),
      types: this.types.setup(),
    };
  }

  public start(core: CoreStart) {
    return {
      types: this.types.start(),
    };
  }

  public stop() {
    this.filters.stop();
    this.types.stop();
  }
}
