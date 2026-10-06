/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ElasticsearchCapabilities,
  ElasticsearchClient,
} from '@kbn/core-elasticsearch-server';
import { type ClusterInfo } from './get_cluster_info';
export declare const getElasticsearchCapabilities: ({
  clusterInfo,
}: {
  clusterInfo: ClusterInfo;
}) => ElasticsearchCapabilities;
/**
 * Returns the capabilities for the ES cluster the provided client is connected to.
 *
 * @internal
 */
export declare const getCapabilitiesFromClient: (
  client: ElasticsearchClient
) => Promise<ElasticsearchCapabilities>;
