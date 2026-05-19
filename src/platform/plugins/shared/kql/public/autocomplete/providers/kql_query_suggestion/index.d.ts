import type { CoreSetup } from '@kbn/core/public';
import type { QuerySuggestionGetFn } from '../query_suggestion_provider';
import type { AutocompleteStart } from '../..';
export declare const KUERY_LANGUAGE_NAME = "kuery";
export declare const setupKqlQuerySuggestionProvider: (core: CoreSetup<object, {
    autocomplete: AutocompleteStart;
}>) => QuerySuggestionGetFn;
