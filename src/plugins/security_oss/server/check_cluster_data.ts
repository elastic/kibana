/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';

export const createClusterDataCheck = () => {
  let clusterHasUserData = false;

  return async function doesClusterHaveUserData(esClient: ElasticsearchClient, log: Logger) {
    if (!clusterHasUserData) {
      try {
        const indices = await esClient.cat.indices<
          Array<{ index: string; ['docs.count']: string }>
        >({
          format: 'json',
          h: ['index', 'docs.count'],
        });
        clusterHasUserData = indices.body.some((indexCount) => {
          const isInternalIndex =
            indexCount.index.startsWith('.') || indexCount.index.startsWith('kibana_sample_');

          return !isInternalIndex && parseInt(indexCount['docs.count'], 10) > 0;
        });
      } catch (e) {
        log.warn(`Error encountered while checking cluster for user data: ${e}`);
        clusterHasUserData = false;
      }
    }
    return clusterHasUserData;
  };
};
