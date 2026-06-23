import { type ParseResult } from '@elastic/esql';
export type EsqlLexerToken = ParseResult['tokens'][number];
/** Reads lexer tokens best-effort from incomplete autocomplete input. */
export declare function getEsqlLexerTokens(text: string): EsqlLexerToken[];
/** Filters out hidden-channel tokens such as whitespace and comments. */
export declare function isVisibleToken(token: EsqlLexerToken): boolean;
