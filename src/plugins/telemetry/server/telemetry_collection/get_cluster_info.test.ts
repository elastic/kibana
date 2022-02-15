/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { getClusterInfo } from './get_cluster_info';

export function mockGetClusterInfo<ClusterInfo>(clusterInfo: ClusterInfo) {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error we only care about the response body
  esClient.info.mockResponse({ ...clusterInfo });
  return esClient;
}

describe('get_cluster_info using the elasticsearch client', () => {
  it('uses the esClient to get info API', async () => {
    const clusterInfo = {
      cluster_uuid: '1234',
      cluster_name: 'testCluster',
      version: {
        number: '7.9.2',
        build_flavor: 'default',
        build_type: 'docker',
        build_hash: 'b5ca9c58fb664ca8bf',
        build_date: '2020-07-21T16:40:44.668009Z',
        build_snapshot: false,
        lucene_version: '8.5.1',
        minimum_wire_compatibility_version: '6.8.0',
        minimum_index_compatibility_version: '6.0.0-beta1',
      },
    };
    const esClient = mockGetClusterInfo(clusterInfo);

    expect(await getClusterInfo(esClient)).toStrictEqual(clusterInfo);
  });
});
