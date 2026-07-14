import type { ICommandContext, ISuggestionItem } from '../../../../../registry/types';
import type { PromQLFunctionParamType } from '../../../../types';
export interface SuggestGroupingInput {
    columns: ICommandContext['columns'] | undefined;
    shouldWrap: boolean;
    preGroupedAgg?: string;
    isAfterAggregationName: boolean;
    canAddGrouping: boolean;
    includePipe: boolean;
    buildVectorSuggestions: (columns: ICommandContext['columns'] | undefined, signatureTypes: PromQLFunctionParamType[], wrap: boolean) => ISuggestionItem[];
}
/** Suggests tokens to continue a query around grouping/pipe/operator boundaries. */
export declare function suggestGrouping(input: SuggestGroupingInput): ISuggestionItem[];
