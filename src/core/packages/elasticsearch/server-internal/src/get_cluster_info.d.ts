/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
/** @internal */
export interface ClusterInfo {
  cluster_name: string;
  cluster_uuid: string;
  cluster_version: string;
  cluster_build_flavor?: string;
}
/**
 * Returns the cluster info from the Elasticsearch cluster.
 * @param internalClient Elasticsearch client
 * @internal
 */
export declare function getClusterInfo$(
  internalClient: ElasticsearchClient
): Observable<ClusterInfo>;
