/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import { defer, map, retry, shareReplay } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

/** @private */
export interface ClusterInfo {
  cluster_name: string;
  cluster_uuid: string;
  cluster_version: string;
}

/**
 * Returns the cluster info from the Elasticsearch cluster.
 * @param internalClient Elasticsearch client
 * @private
 */
export function getClusterInfo$(internalClient: ElasticsearchClient): Observable<ClusterInfo> {
  return defer(() => internalClient.info()).pipe(
    map((info) => ({
      cluster_name: info.cluster_name,
      cluster_uuid: info.cluster_uuid,
      cluster_version: info.version.number,
    })),
    retry({ delay: 1000 }),
    shareReplay(1)
  );
}
