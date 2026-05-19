import type { KueryNode } from '@kbn/es-query';
import type { CoreSetup } from '@kbn/core/public';
import type { QuerySuggestionBasic, QuerySuggestionGetFnArgs } from '../query_suggestion_provider';
import type { AutocompleteStart } from '../../autocomplete_service';
export type KqlQuerySuggestionProvider<T = QuerySuggestionBasic> = (core: CoreSetup<object, {
    autocomplete: AutocompleteStart;
}>) => (querySuggestionsGetFnArgs: QuerySuggestionGetFnArgs, kueryNode: KueryNode) => Promise<T[]>;
