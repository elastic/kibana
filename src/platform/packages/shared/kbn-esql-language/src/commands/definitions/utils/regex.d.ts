export declare const ESQL_IDENTIFIER_PATTERN = "[A-Za-z_][A-Za-z0-9_]*";
export declare function endsWithComma(text: string): boolean;
export declare function endsWithAssignment(text: string): boolean;
export declare function endsWithWhitespace(text: string): boolean;
export declare function endsWithNonWhitespace(text: string): boolean;
export declare function containsWhitespace(text: string): boolean;
export declare function isOnlyWhitespace(text: string): boolean;
export declare function startsWithWordChar(text: string): boolean;
export declare function endsWithOpenParen(text: string): boolean;
export declare function escapeRegExp(text: string): string;
/** Extracts the trailing identifier from text (e.g., "start" from "end=value start"). */
export declare function getTrailingIdentifier(text: string): string | undefined;
export declare function findFirstNonWhitespaceIndex(text: string): number;
export declare function normalizeWhitespace(text: string): string;
