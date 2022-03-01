/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { getClusterStats } from './get_cluster_stats';
import { TIMEOUT } from './constants';

describe('get_cluster_stats', () => {
  it('uses the esClient to get the response from the `cluster.stats` API', async () => {
    const response = { cluster_uuid: '1234' };
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClient.cluster.stats.mockImplementationOnce(
      // @ts-expect-error the method only cares about the response body
      async (_params = { timeout: TIMEOUT }) => {
        return response;
      }
    );
    const result = await getClusterStats(esClient);
    expect(esClient.cluster.stats).toHaveBeenCalledWith({ timeout: TIMEOUT });
    expect(result).toStrictEqual(response);
  });
});
