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
import { Storage } from '../../kibana_utils/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from './types';
import { AutocompleteProviderRegister } from './autocomplete_provider';
import { getSuggestionsProvider } from './suggestions_provider';
import { SearchService } from './search/search_service';
import { QueryService } from './query';

export class DataPublicPlugin implements Plugin<DataPublicPluginSetup, DataPublicPluginStart> {
  private readonly autocomplete = new AutocompleteProviderRegister();
  private readonly searchService: SearchService;
  private readonly queryService: QueryService;

  constructor(initializerContext: PluginInitializerContext) {
    this.searchService = new SearchService(initializerContext);
    this.queryService = new QueryService();
  }

  public setup(core: CoreSetup): DataPublicPluginSetup {
    const storage = new Storage(window.localStorage);
    return {
      autocomplete: this.autocomplete,
      search: this.searchService.setup(core),
      query: this.queryService.setup({
        uiSettings: core.uiSettings,
        storage,
      }),
    };
  }

  public start(core: CoreStart): DataPublicPluginStart {
    return {
      autocomplete: this.autocomplete,
      getSuggestions: getSuggestionsProvider(core.uiSettings, core.http),
      search: this.searchService.start(core),
      query: this.queryService.start(),
    };
  }

  public stop() {
    this.autocomplete.clearProviders();
  }
}
