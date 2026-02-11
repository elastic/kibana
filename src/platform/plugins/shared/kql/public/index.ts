/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PluginInitializerContext } from '@kbn/core/public';
import { KqlPlugin } from './plugin';

export type { KqlPluginStart, KqlPluginSetup } from './plugin';
export type { QueryStringInputProps } from './components/query_string_input';
export { QueryStringInput } from './components/query_string_input';
export { QueryLanguageSwitcher } from './components/query_string_input/language_switcher';
export { FilterButtonGroup } from './components/query_string_input/filter_button_group';
export { fromUser } from './components/query_string_input/from_user';

export type {
  QuerySuggestion,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
  AutocompleteStart,
} from './autocomplete';

export { type SuggestionsAbstraction } from './components/typeahead/suggestions_component';
export type { SuggestionsListSize } from './components/typeahead/suggestions_component';

export { QuerySuggestionTypes } from './autocomplete/providers/query_suggestion_provider';

export function plugin(initializerContext: PluginInitializerContext) {
  return new KqlPlugin(initializerContext);
}
