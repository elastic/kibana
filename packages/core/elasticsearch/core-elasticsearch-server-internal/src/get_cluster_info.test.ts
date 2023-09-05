/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { firstValueFrom } from 'rxjs';
import { getClusterInfo$ } from './get_cluster_info';

describe('getClusterInfo', () => {
  let internalClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>;
  const infoResponse = {
    cluster_name: 'cluster-name',
    cluster_uuid: 'cluster_uuid',
    name: 'name',
    tagline: 'tagline',
    version: {
      number: '1.2.3',
      lucene_version: '1.2.3',
      build_date: 'DateString',
      build_flavor: 'default',
      build_hash: 'string',
      build_snapshot: true,
      build_type: 'string',
      minimum_index_compatibility_version: '1.2.3',
      minimum_wire_compatibility_version: '1.2.3',
    },
  };

  beforeEach(() => {
    internalClient = elasticsearchClientMock.createInternalClient();
  });

  test('it provides the context', async () => {
    internalClient.info.mockResolvedValue(infoResponse);
    const context$ = getClusterInfo$(internalClient);
    await expect(firstValueFrom(context$)).resolves.toMatchInlineSnapshot(`
      Object {
        "cluster_build_flavor": "default",
        "cluster_name": "cluster-name",
        "cluster_uuid": "cluster_uuid",
        "cluster_version": "1.2.3",
      }
    `);
  });

  test('it retries if it fails to fetch the cluster info', async () => {
    internalClient.info.mockRejectedValueOnce(new Error('Failed to fetch cluster info'));
    internalClient.info.mockResolvedValue(infoResponse);
    const context$ = getClusterInfo$(internalClient);
    await expect(firstValueFrom(context$)).resolves.toMatchInlineSnapshot(`
      Object {
        "cluster_build_flavor": "default",
        "cluster_name": "cluster-name",
        "cluster_uuid": "cluster_uuid",
        "cluster_version": "1.2.3",
      }
    `);
    expect(internalClient.info).toHaveBeenCalledTimes(2);
  });

  test('multiple subscribers do not trigger more ES requests', async () => {
    internalClient.info.mockResolvedValue(infoResponse);
    const context$ = getClusterInfo$(internalClient);
    await expect(firstValueFrom(context$)).resolves.toMatchInlineSnapshot(`
      Object {
        "cluster_build_flavor": "default",
        "cluster_name": "cluster-name",
        "cluster_uuid": "cluster_uuid",
        "cluster_version": "1.2.3",
      }
    `);
    await expect(firstValueFrom(context$)).resolves.toMatchInlineSnapshot(`
      Object {
        "cluster_build_flavor": "default",
        "cluster_name": "cluster-name",
        "cluster_uuid": "cluster_uuid",
        "cluster_version": "1.2.3",
      }
    `);
    expect(internalClient.info).toHaveBeenCalledTimes(1);
  });
});
