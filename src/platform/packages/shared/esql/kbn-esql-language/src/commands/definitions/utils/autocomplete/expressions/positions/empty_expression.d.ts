import type { ExpressionContext } from '../types';
import { type ISuggestionItem } from '../../../../../registry/types';
/** Handles suggestions when starting a new expression (empty position) */
export declare function suggestForEmptyExpression(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
