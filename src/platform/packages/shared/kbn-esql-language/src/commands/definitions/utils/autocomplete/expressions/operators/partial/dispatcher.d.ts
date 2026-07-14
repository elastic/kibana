import type { ISuggestionItem } from '../../../../../../registry/types';
import type { ExpressionContext, PartialOperatorDetection } from '../../types';
/**
 * Dispatches partial operator detection to appropriate handler.
 */
export declare function dispatchPartialOperators(operatorName: string, detection: PartialOperatorDetection, context: ExpressionContext): Promise<ISuggestionItem[] | null>;
