import type { SupportedDataType } from '../../../types';
import { FunctionDefinitionTypes } from '../../../types';
export interface CommaContext {
    /** Determines which strategy handler to use */
    position: 'after_complete' | 'empty_expression' | 'enum_value' | 'inside_list';
    /** Common fields across all positions */
    hasMoreMandatoryArgs?: boolean;
    functionType?: FunctionDefinitionTypes;
    isCursorFollowedByComma?: boolean;
    /** True if position is ambiguous in repeating signature (positions 2, 4, 6...) */
    isAmbiguousPosition?: boolean;
    /** True if function accepts arbitrary expressions (e.g. CASE) */
    isExpressionHeavy?: boolean;
    /** Position-specific fields for 'after_complete' */
    typeMatches?: boolean;
    isLiteral?: boolean;
    hasMoreParams?: boolean;
    isVariadic?: boolean;
    /** Type of the current expression (used to distinguish condition vs value in CASE) */
    expressionType?: SupportedDataType | 'unknown';
    innerText?: string;
    listHasValues?: boolean;
}
export declare function shouldSuggestComma(context: CommaContext): boolean;
