/**
 * Expands provided aliases, data streams and wildcards
 * @param indicesOrAliases - single value or an array of indices, aliases and data streams
 * @returns {string | string[]} - single index or an array of resolved indices from provided input.
 */
export declare function expandAliases(indicesOrAliases: string[]): string[];
export declare function expandAliases(indicesOrAliases?: string): string | undefined;
export declare function expandAliases(indicesOrAliases?: string | string[]): string | string[] | undefined;
