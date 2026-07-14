/**
 * Appends cross-cluster search equivalents for each specified index pattern.
 * Use this when you want to query both local and cross-cluster indices automatically.
 */
export declare function indexPatternToCcs(index: string | string[]): string[];
