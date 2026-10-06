export declare const isWhitespace: (ch: string | undefined) => ch is "\t" | "\n" | "\r" | " ";
/**
 * Walks backwards from `fromIndex` until a non-whitespace character is found.
 * Returns that index, or -1 if the scan runs past the beginning.
 */
export declare const skipWhitespaceBackward: (text: string, fromIndex: number) => number;
export declare const isAsciiLetter: (ch: string | undefined) => boolean;
/**
 * Returns true when `index` is positioned at the start of a line.
 * Console input is normalized to `\n` line separators.
 */
export declare const isStartOfLine: (text: string, index: number) => boolean;
/**
 * Returns true when the character at `index` is escaped, i.e. preceded by an odd number of
 * backslashes.
 */
export declare const isEscaped: (text: string, index: number) => boolean;
