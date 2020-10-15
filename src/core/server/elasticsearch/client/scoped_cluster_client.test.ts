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

import { elasticsearchClientMock } from './mocks';
import { ScopedClusterClient } from './scoped_cluster_client';

describe('ScopedClusterClient', () => {
  it('uses the internal client passed in the constructor', () => {
    const internalClient = elasticsearchClientMock.createElasticsearchClient();
    const scopedClient = elasticsearchClientMock.createElasticsearchClient();

    const scopedClusterClient = new ScopedClusterClient(internalClient, scopedClient);

    expect(scopedClusterClient.asInternalUser).toBe(internalClient);
  });

  it('uses the scoped client passed in the constructor', () => {
    const internalClient = elasticsearchClientMock.createElasticsearchClient();
    const scopedClient = elasticsearchClientMock.createElasticsearchClient();

    const scopedClusterClient = new ScopedClusterClient(internalClient, scopedClient);

    expect(scopedClusterClient.asCurrentUser).toBe(scopedClient);
  });
});
