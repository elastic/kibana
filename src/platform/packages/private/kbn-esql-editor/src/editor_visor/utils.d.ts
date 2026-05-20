/**
 * We get the list of all indices (source names) from ES.
 * This function generates index patterns for indices that share the same prefix.
 * For example, if we have indices like:
 * - logs-2023.01.01
 * - logs-2023.01.02
 * This function will generate the index pattern:
 * - logs-*
 * @param sourceNames all the available indices
 * @returns an array of index patterns
 */
export declare const generateIndexPatterns: (sourceNames: string[]) => string[];
