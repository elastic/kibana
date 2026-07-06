/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ensureIndexShardCount } from './ensure_index_shard_count';

const ALIAS = '.kibana_task_manager';
const SOURCE = '.kibana_task_manager_9.2.0_001';
const TARGET = '.kibana_task_manager_9.2.0_002';

const aliasResponse = {
  [SOURCE]: { aliases: { [ALIAS]: {}, '.kibana_task_manager_9.2.0': {} } },
};

const settingsResponse = (shards: number, routingShards: number) => ({
  [SOURCE]: {
    settings: { index: { number_of_shards: shards } },
    defaults: { index: { number_of_routing_shards: routingShards } },
  },
});

describe('ensureIndexShardCount', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is a no-op when the index already has enough shards', async () => {
    const client = elasticsearchClientMock.createInternalClient();
    client.indices.getAlias.mockResolvedValue(aliasResponse);
    client.indices.getSettings.mockResolvedValue(settingsResponse(2, 4));

    await ensureIndexShardCount({ client, logger, alias: ALIAS, numberOfShards: 2 });

    expect(client.indices.split).not.toHaveBeenCalled();
    expect(client.indices.putSettings).not.toHaveBeenCalled();
  });

  it('is a no-op on a fresh deployment (alias does not exist)', async () => {
    const client = elasticsearchClientMock.createInternalClient();
    client.indices.getAlias.mockRejectedValue({ meta: { statusCode: 404 } });

    await ensureIndexShardCount({ client, logger, alias: ALIAS, numberOfShards: 2 });

    expect(client.indices.split).not.toHaveBeenCalled();
  });

  it('does not split when the target is not a valid split of the routing shards', async () => {
    const client = elasticsearchClientMock.createInternalClient();
    client.indices.getAlias.mockResolvedValue(aliasResponse);
    // routing shards = 4 cannot be split into 3
    client.indices.getSettings.mockResolvedValue(settingsResponse(1, 4));

    await ensureIndexShardCount({ client, logger, alias: ALIAS, numberOfShards: 3 });

    expect(client.indices.split).not.toHaveBeenCalled();
  });

  it('splits, swaps every alias, and removes the old index', async () => {
    const client = elasticsearchClientMock.createInternalClient();
    client.indices.getAlias.mockResolvedValue(aliasResponse);
    client.indices.getSettings.mockResolvedValue(settingsResponse(1, 4));

    await ensureIndexShardCount({ client, logger, alias: ALIAS, numberOfShards: 2 });

    expect(client.indices.putSettings).toHaveBeenCalledWith({
      index: SOURCE,
      settings: { 'index.blocks.write': true },
    });
    expect(client.indices.split).toHaveBeenCalledWith({
      index: SOURCE,
      target: TARGET,
      settings: { 'index.number_of_shards': 2, 'index.blocks.write': false },
    });
    expect(client.indices.updateAliases).toHaveBeenCalledWith({
      actions: [
        { remove: { index: SOURCE, alias: ALIAS } },
        { add: { index: TARGET, alias: ALIAS } },
        { remove: { index: SOURCE, alias: '.kibana_task_manager_9.2.0' } },
        { add: { index: TARGET, alias: '.kibana_task_manager_9.2.0' } },
      ],
    });
    expect(client.indices.delete).toHaveBeenCalledWith({ index: SOURCE });
  });

  it('removes the write block and does not throw when the split fails before the swap', async () => {
    const client = elasticsearchClientMock.createInternalClient();
    client.indices.getAlias.mockResolvedValue(aliasResponse);
    client.indices.getSettings.mockResolvedValue(settingsResponse(1, 4));
    client.indices.split.mockRejectedValue(new Error('boom'));

    await expect(
      ensureIndexShardCount({ client, logger, alias: ALIAS, numberOfShards: 2 })
    ).resolves.toBeUndefined();

    expect(client.indices.updateAliases).not.toHaveBeenCalled();
    // write block set (true) then removed (false) during cleanup
    expect(client.indices.putSettings).toHaveBeenNthCalledWith(1, {
      index: SOURCE,
      settings: { 'index.blocks.write': true },
    });
    expect(client.indices.putSettings).toHaveBeenNthCalledWith(2, {
      index: SOURCE,
      settings: { 'index.blocks.write': false },
    });
  });
});
