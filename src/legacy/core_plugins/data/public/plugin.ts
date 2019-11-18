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
import { IndexPatternsService, IndexPatternsSetup, IndexPatternsStart } from './index_patterns';
import { Storage, IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';
import { DataPublicPluginStart } from '../../../../plugins/data/public';
import { initLegacyModule } from './shim/legacy_module';
import { IUiActionsSetup } from '../../../../plugins/ui_actions/public';
import {
  createFilterAction,
  GLOBAL_APPLY_FILTER_ACTION,
} from './filter/action/apply_filter_action';
import { APPLY_FILTER_TRIGGER } from '../../../../plugins/embeddable/public';

export interface DataPluginStartDependencies {
  data: DataPublicPluginStart;
  uiActions: IUiActionsSetup;
}

/**
 * Interface for this plugin's returned `setup` contract.
 *
 * @public
 */
export interface DataSetup {
  indexPatterns: IndexPatternsSetup;
}

/**
 * Interface for this plugin's returned `start` contract.
 *
 * @public
 */
export interface DataStart {
  indexPatterns: IndexPatternsStart;
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

export class DataPlugin implements Plugin<DataSetup, DataStart, {}, DataPluginStartDependencies> {
  private readonly indexPatterns: IndexPatternsService = new IndexPatternsService();
  private readonly search: SearchService = new SearchService();

  private setupApi!: DataSetup;
  private storage!: IStorageWrapper;

  public setup(core: CoreSetup): DataSetup {
    this.storage = new Storage(window.localStorage);

    this.setupApi = {
      indexPatterns: this.indexPatterns.setup(),
    };

    return this.setupApi;
  }

  public start(core: CoreStart, { data, uiActions }: DataPluginStartDependencies): DataStart {
    const { uiSettings, http, notifications, savedObjects } = core;

    const indexPatternsService = this.indexPatterns.start({
      uiSettings,
      savedObjectsClient: savedObjects.client,
      http,
      notifications,
    });

    initLegacyModule(indexPatternsService.indexPatterns);

    const SearchBar = createSearchBar({
      core,
      data,
      storage: this.storage,
    });

    uiActions.registerAction(
      createFilterAction(
        core.overlays,
        data.query.filterManager,
        data.query.timefilter.timefilter,
        indexPatternsService
      )
    );

    uiActions.attachAction(APPLY_FILTER_TRIGGER, GLOBAL_APPLY_FILTER_ACTION);

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
    this.search.stop();
  }
}
