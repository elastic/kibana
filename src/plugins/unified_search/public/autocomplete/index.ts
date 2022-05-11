/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  QuerySuggestion,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
  QuerySuggestionBasic,
  QuerySuggestionField,
} from './providers/query_suggestion_provider';
export { QuerySuggestionTypes } from './providers/query_suggestion_provider';

export type { AutocompleteSetup, AutocompleteStart } from './autocomplete_service';
export { AutocompleteService } from './autocomplete_service';
