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

import { ElasticsearchClient } from 'kibana/server';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { getClusterStats } from './get_cluster_stats';

export function clearMockGetClusterStats(esClient: DeeplyMockedKeys<ElasticsearchClient>) {
  esClient.cluster.stats.mockClear();
}

export function mockGetClusterStats(clusterStats: any): DeeplyMockedKeys<ElasticsearchClient> {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  esClient.cluster.stats.mockResolvedValue(clusterStats);
  return esClient;
}

describe('get_cluster_stats', () => {
  it('uses the esClient to get the response from the `cluster.stats` API', async () => {
    const response = Promise.resolve({ body: { cluster_uuid: '1234' } });
    const esClient = mockGetClusterStats(response);
    expect(getClusterStats(esClient)).toStrictEqual(response);
    clearMockGetClusterStats(esClient);
  });
});
