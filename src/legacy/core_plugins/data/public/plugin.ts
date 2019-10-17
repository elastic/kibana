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

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { SearchService, SearchStart, createSearchBar, StatetfulSearchBarProps } from './search';
import { QueryService, QuerySetup } from './query';
import { FilterService, FilterSetup, FilterStart } from './filter';
import { TimefilterService, TimefilterSetup } from './timefilter';
import { IndexPatternsService, IndexPatternsSetup, IndexPatternsStart } from './index_patterns';
import {
  LegacyDependenciesPluginSetup,
  LegacyDependenciesPluginStart,
} from './shim/legacy_dependencies_plugin';
import { DataPublicPluginStart } from '../../../../plugins/data/public';

/**
 * Interface for any dependencies on other plugins' `setup` contracts.
 *
 * @internal
 */
export interface DataPluginSetupDependencies {
  __LEGACY: LegacyDependenciesPluginSetup;
}

export interface DataPluginStartDependencies {
  data: DataPublicPluginStart;
  __LEGACY: LegacyDependenciesPluginStart;
}

/**
 * Interface for this plugin's returned `setup` contract.
 *
 * @public
 */
export interface DataSetup {
  query: QuerySetup;
  timefilter: TimefilterSetup;
  indexPatterns: IndexPatternsSetup;
  filter: FilterSetup;
}

/**
 * Interface for this plugin's returned `start` contract.
 *
 * @public
 */
export interface DataStart {
  query: QuerySetup;
  timefilter: TimefilterSetup;
  indexPatterns: IndexPatternsStart;
  filter: FilterStart;
  search: SearchStart;
  ui: {
    SearchBar: React.ComponentType<StatetfulSearchBarProps>;
  };
}

/**
 * Data Plugin - public
 *
 * This is the entry point for the entire client-side public contract of the plugin.
 * If something is not explicitly exported here, you can safely assume it is private
 * to the plugin and not considered stable.
 *
 * All stateful contracts will be injected by the platform at runtime, and are defined
 * in the setup/start interfaces. The remaining items exported here are either types,
 * or static code.
 */
export class DataPlugin
  implements
    Plugin<DataSetup, DataStart, DataPluginSetupDependencies, DataPluginStartDependencies> {
  // Exposed services, sorted alphabetically
  private readonly filter: FilterService = new FilterService();
  private readonly indexPatterns: IndexPatternsService = new IndexPatternsService();
  private readonly query: QueryService = new QueryService();
  private readonly search: SearchService = new SearchService();
  private readonly timefilter: TimefilterService = new TimefilterService();

  private setupApi!: DataSetup;

  public setup(core: CoreSetup, { __LEGACY }: DataPluginSetupDependencies): DataSetup {
    const { uiSettings } = core;

    const timefilterService = this.timefilter.setup({
      uiSettings,
      store: __LEGACY.storage,
    });
    const filterService = this.filter.setup({
      uiSettings,
    });
    this.setupApi = {
      indexPatterns: this.indexPatterns.setup(),
      query: this.query.setup(),
      timefilter: timefilterService,
      filter: filterService,
    };

    return this.setupApi;
  }

  public start(core: CoreStart, { __LEGACY, data }: DataPluginStartDependencies): DataStart {
    const { uiSettings, http, notifications, savedObjects } = core;

    const indexPatternsService = this.indexPatterns.start({
      uiSettings,
      savedObjectsClient: savedObjects.client,
      http,
      notifications,
    });

    const SearchBar = createSearchBar({
      core,
      data,
      store: __LEGACY.storage,
      timefilter: this.setupApi.timefilter,
      filterManager: this.setupApi.filter.filterManager,
    });

    return {
      ...this.setupApi!,
      indexPatterns: indexPatternsService,
      search: this.search.start(savedObjects.client),
      ui: {
        SearchBar,
      },
    };
  }

  public stop() {
    this.indexPatterns.stop();
    this.filter.stop();
    this.query.stop();
    this.search.stop();
    this.timefilter.stop();
  }
}
