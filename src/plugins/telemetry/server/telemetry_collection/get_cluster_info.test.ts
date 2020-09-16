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
import { getClusterInfo } from './get_cluster_info';

export function clearMockGetClusterInfo(esClient: DeeplyMockedKeys<ElasticsearchClient>) {
  esClient.info.mockClear();
}

export function mockGetClusterInfo(clusterInfo: any): DeeplyMockedKeys<ElasticsearchClient> {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  esClient.info.mockResolvedValue(clusterInfo);
  return esClient;
}

describe('get_cluster_info using the elasticsearch client', () => {
  it('uses the esClient to get info API', () => {
    const response = Promise.resolve({
      cluster_uuid: '1234',
      cluster_name: 'testCluster',
      version: {
        number: '7.9.2',
        build_flavor: 'string',
        build_type: 'string',
        build_hash: 'string',
        build_date: 'string',
        build_snapshot: false,
        lucene_version: 'string',
        minimum_wire_compatibility_version: 'string',
        minimum_index_compatibility_version: 'string',
      },
    });
    const esClient = mockGetClusterInfo(response);
    expect(getClusterInfo(esClient)).toStrictEqual(response);
    clearMockGetClusterInfo(esClient);
  });
});
