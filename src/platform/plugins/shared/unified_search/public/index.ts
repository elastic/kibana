/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { FilterManager, TimefilterContract } from '@kbn/data-plugin/public';
import type { ConfigSchema } from '../server/config';
import { UnifiedSearchPublicPlugin } from './plugin';

export type {
  QuerySuggestion,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
  AutocompleteStart,
} from './autocomplete';
export type { IndexPatternSelectProps } from './index_pattern_select';
export type { QueryStringInputProps } from './query_string_input';
export type { StatefulSearchBarProps, SearchBarProps } from './search_bar';
export type {
  UnifiedSearchPublicPluginStart,
  UnifiedSearchPluginSetup,
  IUnifiedSearchPluginServices,
} from './types';
export type { FilterItemsProps } from './filter_bar';
export type { DataViewPickerProps } from './dataview_picker';
export type { ApplyGlobalFilterActionContext } from './actions/apply_filter_action/apply_filter_action';

export { QueryStringInput } from './query_string_input';
export { QuerySuggestionTypes } from './autocomplete/providers/query_suggestion_provider';
export { SearchBar } from './search_bar';
export { createSearchBar } from './search_bar/create_search_bar';
export { FilterItem, FilterItems } from './filter_bar';
export { FilterBadgeGroup } from './filter_badge';
export { DataViewPicker, DataViewSelector, DataViewsList } from './dataview_picker';
export { ACTION_GLOBAL_APPLY_FILTER, UPDATE_FILTER_REFERENCES_ACTION } from './actions/constants';
export { UPDATE_FILTER_REFERENCES_TRIGGER } from './triggers';

export async function createFilterAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract,
  coreStart: CoreStart,
  id: string,
  type: string
) {
  const { createFilterAction: createAction } = await import('./actions/actions_module');
  return createAction(filterManager, timeFilter, coreStart, id, type);
}

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new UnifiedSearchPublicPlugin(initializerContext);
}
