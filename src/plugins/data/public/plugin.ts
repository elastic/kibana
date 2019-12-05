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
import { Storage } from '../../kibana_utils/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from './types';
import { AutocompleteProviderRegister } from './autocomplete_provider';
import { getSuggestionsProvider } from './suggestions_provider';
import { SearchService } from './search/search_service';
import { FieldFormatsService } from './field_formats_provider';
import { QueryService } from './query';
import { createIndexPatternSelect } from './ui/index_pattern_select';
import { IndexPatternsService } from './index_patterns';

export class DataPublicPlugin implements Plugin<DataPublicPluginSetup, DataPublicPluginStart> {
  private readonly indexPatterns: IndexPatternsService = new IndexPatternsService();
  private readonly autocomplete = new AutocompleteProviderRegister();
  private readonly searchService: SearchService;
  private readonly fieldFormatsService: FieldFormatsService;
  private readonly queryService: QueryService;

  constructor(initializerContext: PluginInitializerContext) {
    this.searchService = new SearchService(initializerContext);
    this.queryService = new QueryService();
    this.fieldFormatsService = new FieldFormatsService();
  }

  public setup(core: CoreSetup): DataPublicPluginSetup {
    const storage = new Storage(window.localStorage);

    return {
      autocomplete: this.autocomplete,
      search: this.searchService.setup(core),
      fieldFormats: this.fieldFormatsService.setup(core),
      query: this.queryService.setup({
        uiSettings: core.uiSettings,
        storage,
      }),
    };
  }

  public start(core: CoreStart): DataPublicPluginStart {
    const { uiSettings, http, notifications, savedObjects } = core;
    const fieldFormats = this.fieldFormatsService.start();

    return {
      autocomplete: this.autocomplete,
      getSuggestions: getSuggestionsProvider(core.uiSettings, core.http),
      search: this.searchService.start(core),
      fieldFormats,
      query: this.queryService.start(core.savedObjects),
      ui: {
        IndexPatternSelect: createIndexPatternSelect(core.savedObjects.client),
      },
      indexPatterns: this.indexPatterns.start({
        uiSettings,
        savedObjectsClient: savedObjects.client,
        http,
        notifications,
        fieldFormats,
      }),
    };
  }

  public stop() {
    this.indexPatterns.stop();
    this.autocomplete.clearProviders();
  }
}
