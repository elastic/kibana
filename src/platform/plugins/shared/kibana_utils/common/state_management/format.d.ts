import type { ParsedQuery } from 'query-string';
export declare function replaceUrlQuery(rawUrl: string, queryReplacer: (query: ParsedQuery) => ParsedQuery): string;
export declare function replaceUrlHashQuery(rawUrl: string, queryReplacer: (query: ParsedQuery) => ParsedQuery): string;
