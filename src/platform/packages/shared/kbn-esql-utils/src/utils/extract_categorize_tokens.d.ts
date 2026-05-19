/**
 * Extracts "tokens" from a regex string (produced by the categorize function) by stripping leading/trailing '.*?'
 * and splitting the remainder by '.+?'.
 *
 * @param {string} regexString The regular expression string.
 * @returns {string[]} An array of extracted "keywords".
 */
export declare function extractCategorizeTokens(regexString: string): string[];
