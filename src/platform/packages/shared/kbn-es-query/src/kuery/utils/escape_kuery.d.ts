/**
 * Escapes backslashes and double-quotes. (Useful when putting a string in quotes to use as a value
 * in a KQL expression. See the QuotedCharacter rule in kuery.peg.)
 */
export declare function escapeQuotes(str: string): string;
/**
 * Escapes a Kuery node value to ensure that special characters, operators, and whitespace do not result in a parsing error or unintended
 * behavior when using the value as an argument for the `buildNode` function.
 */
export declare const escapeKuery: (str: string) => string;
