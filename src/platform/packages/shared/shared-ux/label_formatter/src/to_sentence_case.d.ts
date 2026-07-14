/**
 * Converts a string to sentence case.
 * For glossary terms, applies the exact formatting from the glossary.
 * For non-glossary terms, capitalizes only the first letter.
 *
 * @param label - The label string to format
 * @returns formatted label string
 * @example
 * toSentenceCase('machine learning') // 'Machine Learning' - Glossary term
 * toSentenceCase('settings') // 'Settings' - First letter capitalized
 */
export declare function toSentenceCase(label: string): string;
