/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export function getListOfCCSIndices(
  clusters: string[],
  lookupIndices: IndexAutocompleteItem[]
): IndexAutocompleteItem[] {
  if (!clusters.length || !lookupIndices.length) {
    return [];
  }

  // Get indices for each cluster, storing the full IndexAutocompleteItem objects
  const clusterIndicesMap = new Map<string, Map<string, IndexAutocompleteItem>>();

  clusters.forEach((cluster) => {
    clusterIndicesMap.set(cluster, new Map());
  });

  // Parse lookup resources and group by cluster
  lookupIndices.forEach((lookupResource) => {
    const colonIndex = lookupResource.name.indexOf(':');
    if (colonIndex > 0 && colonIndex < lookupResource.name.length - 1) {
      const cluster = lookupResource.name.substring(0, colonIndex);
      const index = lookupResource.name.substring(colonIndex + 1);

      if (clusterIndicesMap.has(cluster)) {
        clusterIndicesMap.get(cluster)!.set(index, lookupResource);
      }
    }
  });

  // Find resources that exist in all specified clusters
  const clusterResourcesMaps = Array.from(clusterIndicesMap.values());
  if (clusterResourcesMaps.length === 0) {
    return [];
  }

  // Start with indices from the first cluster
  let commonIndices = Array.from(clusterResourcesMaps[0].keys());

  // Find intersection with other clusters
  for (let i = 1; i < clusterResourcesMaps.length; i++) {
    commonIndices = commonIndices.filter((index) => clusterResourcesMaps[i].has(index));
  }

  // Return the IndexAutocompleteItem objects for common indices with cluster prefix removed
  return commonIndices.map((index) => {
    const allAliases: string[] = [];
    let baseItem: IndexAutocompleteItem | undefined;

    for (const clusterMap of clusterResourcesMaps) {
      const item = clusterMap.get(index);
      if (item) {
        if (!baseItem) {
          baseItem = item;
        }
        if (item.aliases) {
          allAliases.push(...item.aliases);
        }
      }
    }

    return {
      ...baseItem!,
      name: index,
      aliases: [...new Set(allAliases)], // Remove duplicates
    };
  });
}
