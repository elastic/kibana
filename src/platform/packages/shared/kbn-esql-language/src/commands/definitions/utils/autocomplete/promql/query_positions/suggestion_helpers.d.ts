import { type PromQLFunctionParamType } from '../../../../types';
import type { ICommandContext, ISuggestionItem } from '../../../../../registry/types';
/** Builds field/function suggestions for vector-like argument contexts. */
export declare function buildVectorSuggestions(columns: ICommandContext['columns'] | undefined, signatureTypes: PromQLFunctionParamType[], wrap: boolean): ISuggestionItem[];
/** Suggests tokens immediately after a complete query expression. */
export declare function buildNextActionsSuggestion(input: {
    columns: ICommandContext['columns'] | undefined;
    shouldWrap: boolean;
    preGroupedAgg?: string;
    isAfterAggregationName: boolean;
    canAddGrouping: boolean;
}): ISuggestionItem[];
export declare function buildFieldSuggestions(columns: ICommandContext['columns'] | undefined, types: readonly string[] | undefined, wrap: 'wrap' | 'plain'): ISuggestionItem[];
/** Returns a cached comma suggestion wrapped with autosuggest metadata. */
export declare const buildCommaWithAutoSuggest: () => ISuggestionItem;
