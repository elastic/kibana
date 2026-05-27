import type { ValueSuggestionsMethod } from '@kbn/data-plugin/common';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { SuggestionsAbstraction } from '../../components/typeahead/suggestions_component';
export declare enum QuerySuggestionTypes {
    Field = "field",
    Value = "value",
    Operator = "operator",
    Conjunction = "conjunction",
    RecentSearch = "recentSearch"
}
export type QuerySuggestionGetFn = (args: QuerySuggestionGetFnArgs) => Promise<QuerySuggestion[]> | undefined;
/** @public **/
export interface QuerySuggestionGetFnArgs {
    language: string;
    indexPatterns: DataView[];
    query: string;
    selectionStart: number;
    selectionEnd: number;
    signal?: AbortSignal;
    useTimeRange?: boolean;
    boolFilter?: any;
    method?: ValueSuggestionsMethod;
    suggestionsAbstraction?: SuggestionsAbstraction;
}
/** @public **/
export interface QuerySuggestionBasic {
    type: QuerySuggestionTypes;
    description?: string | JSX.Element;
    end: number;
    start: number;
    text: string;
    cursorIndex?: number;
}
/** @public **/
export interface QuerySuggestionField extends QuerySuggestionBasic {
    type: QuerySuggestionTypes.Field;
    field: DataViewField;
}
/** @public **/
export type QuerySuggestion = QuerySuggestionBasic | QuerySuggestionField;
