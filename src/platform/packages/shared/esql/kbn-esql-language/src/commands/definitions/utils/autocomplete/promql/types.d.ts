import type { PromQLAstNode, PromQLBinaryExpression, PromQLFunction, PromQLSelector } from '@elastic/esql';
import type { PromQLFunctionParamType } from '../../../types';
export interface CursorMatch {
    node: PromQLAstNode;
    parent: PromQLAstNode | undefined;
}
export interface CursorContext {
    match: CursorMatch | undefined;
    innermostFunc: PromQLFunction | undefined;
    outermostIncompleteBinary: PromQLBinaryExpression | undefined;
}
export type PromqlDetailedPositionType = 'after_command' | 'after_param_keyword' | 'after_param_equals' | 'inside_query' | 'after_query' | 'after_operator' | 'inside_grouping' | 'inside_function_args' | 'after_complete_arg' | 'after_label_brace' | 'after_label_name' | 'after_label_operator' | 'after_label_selector' | 'after_metric';
export interface PromqlDetailedPosition {
    type: PromqlDetailedPositionType;
    currentParam?: string;
    canAddGrouping?: boolean;
    isAfterAggregationName?: boolean;
    selector?: PromQLSelector;
    canSuggestRangeSelector?: boolean;
    isCompleteLabel?: boolean;
    canSuggestCommaInFunctionArgs?: boolean;
    signatureTypes?: PromQLFunctionParamType[];
}
