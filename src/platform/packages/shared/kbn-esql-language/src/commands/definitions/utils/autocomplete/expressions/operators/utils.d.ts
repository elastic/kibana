import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { ISuggestionItem } from '../../../../../registry/types';
export declare const LIKE_OPERATOR_REGEX: RegExp;
export declare const IS_NOT_REGEX: RegExp;
export declare const IS_NULL_OPERATOR_REGEX: RegExp;
export declare const IN_OPERATOR_REGEX: RegExp;
export declare const NOT_IN_REGEX: RegExp;
export declare function endsWithInOrNotInToken(innerText: string): boolean;
export declare function endsWithLikeOrRlikeToken(innerText: string): boolean;
export declare function endsWithIsOrIsNotToken(innerText: string): boolean;
export declare function isOperandMissing(operand: ESQLSingleAstItem | undefined): boolean;
/** Returns true when the IN-family right operand can still be started. */
export declare function shouldSuggestRightOperandStart(operand: ESQLSingleAstItem | undefined): boolean;
/** Suggestions for logical continuations after a complete boolean operator expression. */
export declare function getLogicalContinuationSuggestions(): ISuggestionItem[];
