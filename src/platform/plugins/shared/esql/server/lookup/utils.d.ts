import type { IndexAutocompleteItem } from '@kbn/esql-types';
/**
 * Finds lookup indices that exist across all specified remote clusters.
 *
 * This function takes a list of cluster names and a list of lookup indices in the format
 * "cluster:index" and returns the IndexAutocompleteItem objects that are available in ALL specified clusters.
 * This is useful for cross-cluster search scenarios where you want to find indices that
 * can be queried across multiple clusters.
 *
 * @param clusters - Array of cluster names to check for common indices
 * @param lookupIndices - Array of IndexAutocompleteItem objects. The 'name' property is expected to be in "cluster:index" format.
 * @returns Array of IndexAutocompleteItem objects that exist in all specified clusters
 *
 * @example
 * // Returns IndexAutocompleteItem for 'logs' with merged aliases ['alias1', 'alias2']
 * getListOfCCSIndices(
 *   ['cluster1', 'cluster2'],
 *   [
 *     { name: 'cluster1:logs', aliases: ['alias1'] },
 *     { name: 'cluster2:logs', aliases: ['alias2'] },
 *     { name: 'cluster1:metrics' }
 *   ]
 * )
 *
 * @example
 * // Returns IndexAutocompleteItem objects for 'index1', 'index2' because both exist in cluster1
 * getListOfCCSIndices(
 *   ['cluster1'],
 *   [{ name: 'cluster1:index1' }, { name: 'cluster1:index2' }, { name: 'cluster2:index3' }]
 * )
 */
export declare function getListOfCCSIndices(clusters: string[], lookupIndices: IndexAutocompleteItem[]): IndexAutocompleteItem[];
