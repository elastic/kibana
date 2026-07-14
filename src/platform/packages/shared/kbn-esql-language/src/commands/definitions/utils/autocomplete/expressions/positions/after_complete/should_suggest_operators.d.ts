import type { SupportedDataType } from '../../../../../types';
import type { ExpressionContext, FunctionParameterContext } from '../../types';
export interface OperatorRuleContext {
    expressionType: SupportedDataType | 'unknown';
    functionParameterContext?: FunctionParameterContext;
    ctx: ExpressionContext;
}
export interface OperatorDecision {
    shouldSuggest: boolean;
    allowedOperators?: string[];
    reason?: string;
}
/** Determines whether operators should be suggested for the current context. */
export declare function shouldSuggestOperators(context: OperatorRuleContext): OperatorDecision;
