/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { ConfigSchema } from '../config';
export type { IndexPatternSelectProps } from './index_pattern_select';
export type { QueryStringInputProps } from './query_string_input';
export { QueryStringInput } from './query_string_input';
export type { StatefulSearchBarProps, SearchBarProps } from './search_bar';
export type { UnifiedSearchPublicPluginStart, UnifiedSearchPluginSetup } from './types';
export { SearchBar } from './search_bar';
export { FilterLabel, FilterItem } from './filter_bar';

export type { ApplyGlobalFilterActionContext } from './actions';
export { ACTION_GLOBAL_APPLY_FILTER } from './actions';

/*
 * Autocomplete query suggestions:
 */
export type {
  QuerySuggestion,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
  AutocompleteStart,
} from './autocomplete';

export { QuerySuggestionTypes } from './autocomplete/providers/query_suggestion_provider';

import { UnifiedSearchPublicPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new UnifiedSearchPublicPlugin(initializerContext);
}
