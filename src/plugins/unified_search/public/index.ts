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
export type {
  UnifiedSearchPublicPluginStart,
  UnifiedSearchPluginSetup,
  IUnifiedSearchPluginServices,
} from './types';
export { SearchBar } from './search_bar';
export type { FilterItemsProps } from './filter_bar';
export { FilterItem, FilterItems } from './filter_bar';
export { FilterBadgeGroup } from './filter_badge';

export { DataViewPicker, DataViewSelector, DataViewsList } from './dataview_picker';
export type { DataViewPickerProps } from './dataview_picker';

export type { ApplyGlobalFilterActionContext } from './actions';
export { ACTION_GLOBAL_APPLY_FILTER, UPDATE_FILTER_REFERENCES_ACTION } from './actions';
export { UPDATE_FILTER_REFERENCES_TRIGGER } from './triggers';
export { createSearchBar } from './search_bar/create_search_bar';

export { createFilterAction } from './actions/apply_filter_action';

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
