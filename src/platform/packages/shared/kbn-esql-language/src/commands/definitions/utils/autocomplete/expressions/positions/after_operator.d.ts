import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionContext } from '../types';
/**
 * Suggests completions after an operator (e.g., field = |, field IN |)
 * Handles special cases (IN, IS NULL) or delegates to generic operator logic
 */
export declare function suggestAfterOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
