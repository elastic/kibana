/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Finds lookup indices that exist across all specified remote clusters.
 *
 * This function takes a list of cluster names and a list of lookup indices in the format
 * "cluster:index" and returns the index names that are available in ALL specified clusters.
 * This is useful for cross-cluster search scenarios where you want to find indices that
 * can be queried across multiple clusters.
 *
 * @param clusters - Array of cluster names to check for common indices
 * @param lookupResources - Array of indices/aliases in "cluster:index" format
 * @returns Array of index names that exist in all specified clusters
 *
 * @example
 * // Returns ['logs'] because it exists in both cluster1 and cluster2
 * getListOfCCSResources(['cluster1', 'cluster2'], ['cluster1:logs', 'cluster2:logs', 'cluster1:metrics'])
 *
 * @example
 * // Returns ['index1', 'index2'] because both exist in cluster1
 * getListOfCCSResources(['cluster1'], ['cluster1:index1', 'cluster1:index2', 'cluster2:index3'])
 */
export function getListOfCCSResources(clusters: string[], lookupResources: string[]): string[] {
  if (!clusters.length || !lookupResources.length) {
    return [];
  }

  // Get indices for each cluster
  const clusterIndicesMap = new Map<string, Set<string>>();

  clusters.forEach((cluster) => {
    clusterIndicesMap.set(cluster, new Set());
  });

  // Parse lookup resources and group by cluster
  lookupResources.forEach((lookupResource) => {
    const colonIndex = lookupResource.indexOf(':');
    if (colonIndex > 0 && colonIndex < lookupResource.length - 1) {
      const cluster = lookupResource.substring(0, colonIndex);
      const index = lookupResource.substring(colonIndex + 1);

      if (clusterIndicesMap.has(cluster)) {
        clusterIndicesMap.get(cluster)!.add(index);
      }
    }
  });

  // Find resources that exist in all specified clusters
  const clusterResourcesSets = Array.from(clusterIndicesMap.values());
  if (clusterResourcesSets.length === 0) {
    return [];
  }

  // Start with resources from the first cluster
  let commonResources = new Set(clusterResourcesSets[0]);

  // Find intersection with other clusters
  for (let i = 1; i < clusterResourcesSets.length; i++) {
    commonResources = new Set(
      [...commonResources].filter((resource) => clusterResourcesSets[i].has(resource))
    );
  }

  return [...commonResources];
}
