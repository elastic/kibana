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
import { Storage, IStorageWrapper } from '../../kibana_utils/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataSetupDependencies,
  DataStartDependencies,
} from './types';
import { AutocompleteProviderRegister } from './autocomplete_provider';
import { getSuggestionsProvider } from './suggestions_provider';
import { SearchService } from './search/search_service';
import { FieldFormatsService } from './field_formats_provider';
import { QueryService } from './query';
import { createIndexPatternSelect } from './ui/index_pattern_select';
import { IndexPatterns } from './index_patterns';
import {
  setFieldFormats,
  setHttp,
  setIndexPatterns,
  setNotifications,
  setOverlays,
  setQueryService,
} from './services';
import { createFilterAction, GLOBAL_APPLY_FILTER_ACTION } from './actions';
import { APPLY_FILTER_TRIGGER } from '../../embeddable/public';
import { createSearchBar } from './ui/search_bar/create_search_bar';

export class DataPublicPlugin implements Plugin<DataPublicPluginSetup, DataPublicPluginStart> {
  private readonly autocomplete = new AutocompleteProviderRegister();
  private readonly searchService: SearchService;
  private readonly fieldFormatsService: FieldFormatsService;
  private readonly queryService: QueryService;
  private readonly storage: IStorageWrapper;

  constructor(initializerContext: PluginInitializerContext) {
    this.searchService = new SearchService(initializerContext);
    this.queryService = new QueryService();
    this.fieldFormatsService = new FieldFormatsService();
    this.storage = new Storage(window.localStorage);
  }

  public setup(core: CoreSetup, { uiActions }: DataSetupDependencies): DataPublicPluginSetup {
    const queryService = this.queryService.setup({
      uiSettings: core.uiSettings,
      storage: this.storage,
    });

    uiActions.registerAction(
      createFilterAction(queryService.filterManager, queryService.timefilter.timefilter)
    );

    return {
      autocomplete: this.autocomplete,
      search: this.searchService.setup(core),
      fieldFormats: this.fieldFormatsService.setup(core),
      query: queryService,
    };
  }

  public start(core: CoreStart, { uiActions }: DataStartDependencies): DataPublicPluginStart {
    const { uiSettings, http, notifications, savedObjects, overlays } = core;
    const fieldFormats = this.fieldFormatsService.start();
    setHttp(http);
    setNotifications(notifications);
    setFieldFormats(fieldFormats);
    setOverlays(overlays);

    const indexPatternsService = new IndexPatterns(uiSettings, savedObjects.client, http);
    setIndexPatterns(indexPatternsService);

    const queryService = this.queryService.start(core.savedObjects);
    setQueryService(queryService);

    uiActions.attachAction(APPLY_FILTER_TRIGGER, GLOBAL_APPLY_FILTER_ACTION);

    const dataServices = {
      autocomplete: this.autocomplete,
      getSuggestions: getSuggestionsProvider(core.uiSettings, core.http),
      search: this.searchService.start(core),
      fieldFormats,
      query: queryService,
      indexPatterns: indexPatternsService,
    };

    const SearchBar = createSearchBar({
      core,
      data: dataServices,
      storage: this.storage,
    });

    return {
      ...dataServices,
      ui: {
        IndexPatternSelect: createIndexPatternSelect(core.savedObjects.client),
        SearchBar,
      },
    };
  }

  public stop() {
    this.autocomplete.clearProviders();
  }
}
