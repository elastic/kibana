/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { checkIncompatibleMappings } from './check_incompatible_mappings';
import { createSomeDevLogMock } from './mocks';

describe('#checkIncompatibleMappings', () => {
  let log: SomeDevLog;
  let esClient: Client;
  beforeEach(() => {
    log = createSomeDevLogMock();
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser as unknown as Client;
  });

  test('calls ES with the expected inputs', async () => {
    await checkIncompatibleMappings({ log, esClient, currentMappings: {}, nextMappings: {} });
    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: '.kibana_mappings_check',
      mappings: {
        dynamic: false,
        properties: {},
      },
      settings: {
        mapping: {
          total_fields: {
            limit: 1500,
          },
        },
      },
    });
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: '.kibana_mappings_check',
      properties: {},
    });
  });

  test('throws expected error when cannot put mappings', async () => {
    (esClient.indices.putMapping as jest.Mock).mockRejectedValueOnce(new Error('foo'));
    expect(() =>
      checkIncompatibleMappings({ log, esClient, currentMappings: {}, nextMappings: {} })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Only mappings changes that are compatible with current mappings are allowed. Consider reaching out to the Kibana core team if you are stuck."`
    );
  });
});
