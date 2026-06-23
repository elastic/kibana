import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionContext } from '../types';
/**
 * Handler for autocomplete suggestions after complete expressions.
 * Handles after_complete position for all complete expression types:
 * - Columns (e.g., "field /")
 * - Functions (e.g., "ABS(x) /")
 * - Literals (e.g., "123 /" or "true /")
 * - Postfix operators (e.g., "field IS NULL /")
 *
 * Boolean literals (true/false) have special operator filtering logic.
 */
export declare function suggestAfterComplete(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
