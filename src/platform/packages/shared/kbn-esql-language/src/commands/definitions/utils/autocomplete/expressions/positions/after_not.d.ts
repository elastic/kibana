import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionContext } from '../types';
/**
 * Suggests completions after the NOT keyword
 * - After unary NOT function: NOT / (suggest boolean functions/fields)
 * - After NOT keyword before operators: field NOT / (suggest IN, LIKE, RLIKE)
 */
export declare function suggestAfterNot(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
