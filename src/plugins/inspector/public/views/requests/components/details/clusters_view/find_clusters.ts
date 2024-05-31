/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { EuiSearchBar, type Query } from '@elastic/eui';
import { Request } from '../../../../../../common/adapters/request/types';
import { getLocalClusterDetails, LOCAL_CLUSTER_KEY } from './local_cluster';

export function findClusters(
  request: Request,
  query?: Query
): Record<string, estypes.ClusterDetails> {
  const rawResponse = (request.response?.json as { rawResponse?: estypes.SearchResponse })
    ?.rawResponse;
  if (!rawResponse) {
    return {};
  }

  const clusters = rawResponse._clusters
    ? (
        rawResponse._clusters as estypes.ClusterStatistics & {
          details: Record<string, estypes.ClusterDetails>;
        }
      ).details
    : {
        [LOCAL_CLUSTER_KEY]: getLocalClusterDetails(rawResponse),
      };

  if (!query) {
    return clusters;
  }

  const clusterItems = Object.keys(clusters).map((key) => {
    return {
      name: key,
      status: clusters[key].status,
    };
  });

  const narrowedClusterItems = EuiSearchBar.Query.execute(query, clusterItems, {
    defaultFields: ['name'],
  });

  const narrowedClusers: Record<string, estypes.ClusterDetails> = {};
  narrowedClusterItems.forEach(({ name }) => {
    narrowedClusers[name] = clusters[name];
  });
  return narrowedClusers;
}
