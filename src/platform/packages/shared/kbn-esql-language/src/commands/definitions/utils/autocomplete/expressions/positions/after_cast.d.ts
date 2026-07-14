import type { SupportedDataType } from '../../../../..';
import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionContext } from '../types';
/**
 * Suggests completions after the cast (::) keyword.
 * We suggest only casting types that can be applied to the value being casted.
 */
export declare function suggestAfterCast(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
/**
 * Returns suggestions for inline casts.
 * If sourceType is provided, only returns casting types that can be applied to it.
 */
export declare function getCastingTypesSuggestions(typeBeingCasted?: SupportedDataType): ISuggestionItem[];
