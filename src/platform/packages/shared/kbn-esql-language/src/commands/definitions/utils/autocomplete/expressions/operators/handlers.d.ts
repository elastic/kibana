import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionContext } from '../types';
/** Handles IN and NOT IN operators with list syntax or subquery syntax. */
export declare function handleListOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
/** Handles NULL-check operators (IS NULL, IS NOT NULL) */
export declare function handleNullCheckOperator(ctx: ExpressionContext): Promise<ISuggestionItem[] | null>;
/** Handles string pattern operators with list syntax (e.g., field LIKE ("*pattern*", "*other*")) */
export declare function handleStringListOperator(context: ExpressionContext): Promise<ISuggestionItem[] | null>;
