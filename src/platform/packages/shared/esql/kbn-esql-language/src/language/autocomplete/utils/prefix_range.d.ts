import type { ICommandContext, ISuggestionItem } from '../../../commands/registry/types';
import { type EsqlLexerToken } from '../../shared/lexer_scope';
type PrefixClassification = 'token-based' | 'compound-prefix' | 'fallback-required';
export interface PrefixResult {
    prefix: string;
    range: {
        start: number;
        end: number;
    };
    classification: PrefixClassification;
}
export declare enum ReplacementRangeStrategyKind {
    /** Replace the active prefix inside a scoped fragment. */
    SCOPED_PREFIX = "scoped_prefix",
    /** Replace the whole scoped fragment. */
    WHOLE_SCOPE = "whole_scope",
    /** Replace a quoted literal's value, keeping the quotes. */
    QUOTED_VALUE = "quoted_value",
    /** Replace trailing whitespace before the cursor. */
    TRAILING_WHITESPACE = "trailing_whitespace",
    /** Replace the entire root query. */
    ROOT_QUERY = "root_query"
}
export type ReplacementRangeStrategy = {
    kind: ReplacementRangeStrategyKind.SCOPED_PREFIX | ReplacementRangeStrategyKind.WHOLE_SCOPE | ReplacementRangeStrategyKind.QUOTED_VALUE;
    scopeText: string;
    startOffset?: number;
} | {
    kind: ReplacementRangeStrategyKind.TRAILING_WHITESPACE;
} | {
    kind: ReplacementRangeStrategyKind.ROOT_QUERY;
};
export interface AttachReplacementRangesOptions {
    /** Lexer tokens for `innerText`. */
    tokens: EsqlLexerToken[];
    /** Command context used to look up existing columns and resolve column-match rules. */
    commandContext?: ICommandContext;
    /** Full query text — required when a suggestion declares a `ROOT_QUERY` strategy. */
    fullText?: string;
    /** Cursor offset into `fullText` — required alongside `fullText` for `ROOT_QUERY`. */
    offset?: number;
}
/**
 * Standalone prefix resolver for callers that only have text.
 * The final suggestion range path passes prepared tokens to attachReplacementRanges
 * so it does not re-lex the same innerText.
 */
export declare function computePrefixRange(query: string): PrefixResult;
/** Attaches replacement ranges, preserveTypedPrefix and requiresExistingColumnMatch. */
export declare function attachReplacementRanges(innerText: string, suggestions: ISuggestionItem[], options: AttachReplacementRangesOptions): ISuggestionItem[];
export {};
