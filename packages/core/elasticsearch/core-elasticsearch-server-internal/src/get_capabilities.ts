/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { ClusterInfo } from './get_cluster_info';

const SERVERLESS_BUILD_FLAVOR = 'serverless';

export const getElasticsearchCapabilities = ({
  clusterInfo,
}: {
  clusterInfo: ClusterInfo;
}): ElasticsearchCapabilities => {
  const buildFlavor = clusterInfo.cluster_build_flavor;

  return {
    serverless: buildFlavor === SERVERLESS_BUILD_FLAVOR,
  };
};
