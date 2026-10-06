import type { ExpressionContext } from '../types';
import type { ISuggestionItem } from '../../../../../registry/types';
/** Suggests completions when cursor is inside a function call (e.g., CONCAT(field1, /)) */
export declare function suggestInFunction(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
