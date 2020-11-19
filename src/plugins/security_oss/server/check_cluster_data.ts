/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
