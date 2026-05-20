/**
 * Pre-computes the rename source field resolution for every rename target in a single parse pass.
 * Use this when resolving multiple columns for the same query (e.g. a full column list from an
 * ES response). Only columns that actually resolve to a different source field are present in the
 * returned map; callers should fall back to the column name for absent entries.
 */
export declare function buildRenameSourceFieldMap(query: string): Map<string, string>;
