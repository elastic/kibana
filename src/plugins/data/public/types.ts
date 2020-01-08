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

import { CoreStart } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { IUiActionsSetup, IUiActionsStart } from 'src/plugins/ui_actions/public';
import { AutocompletePublicPluginSetup, AutocompletePublicPluginStart } from '.';
import { FieldFormatsSetup, FieldFormatsStart } from './field_formats_provider';
import { ISearchSetup, ISearchStart } from './search';
import { IGetSuggestions } from './suggestions_provider/types';
import { QuerySetup, QueryStart } from './query';
import { IndexPatternSelectProps } from './ui/index_pattern_select';
import { IndexPatternsContract } from './index_patterns';
import { StatefulSearchBarProps } from './ui/search_bar/create_search_bar';

export interface DataSetupDependencies {
  uiActions: IUiActionsSetup;
}

export interface DataStartDependencies {
  uiActions: IUiActionsStart;
}

export interface DataPublicPluginSetup {
  autocomplete: AutocompletePublicPluginSetup;
  search: ISearchSetup;
  fieldFormats: FieldFormatsSetup;
  query: QuerySetup;
}

export interface DataPublicPluginStart {
  autocomplete: AutocompletePublicPluginStart;
  getSuggestions: IGetSuggestions;
  indexPatterns: IndexPatternsContract;
  search: ISearchStart;
  fieldFormats: FieldFormatsStart;
  query: QueryStart;
  ui: {
    IndexPatternSelect: React.ComponentType<IndexPatternSelectProps>;
    SearchBar: React.ComponentType<StatefulSearchBarProps>;
  };
}

export * from './autocomplete_provider/types';
export { IGetSuggestions } from './suggestions_provider/types';

export interface IDataPluginServices extends Partial<CoreStart> {
  appName: string;
  uiSettings: CoreStart['uiSettings'];
  savedObjects: CoreStart['savedObjects'];
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
}
