/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlMaterializeStepHandler } from '../esql_materialize_step_handler';

const createMockEsClient = (queryResponse: unknown, bulkResponse: unknown) =>
  ({
    transport: {
      request: jest.fn().mockResolvedValue(queryResponse),
    },
    bulk: jest.fn().mockResolvedValue(bulkResponse),
  } as any);

const createLogger = () =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as any);

describe('EsqlMaterializeStepHandler', () => {
  it('queries ES|QL and bulk indexes results to target index', async () => {
    const queryResponse = {
      columns: [
        { name: 'entity_id', type: 'keyword' },
        { name: 'status', type: 'keyword' },
      ],
      values: [
        ['repo-1', 'active'],
        ['repo-2', 'stale'],
      ],
    };
    const bulkResponse = {
      items: [
        { index: { _index: 'target', _id: 'snap-0', status: 201 } },
        { index: { _index: 'target', _id: 'snap-1', status: 201 } },
      ],
      errors: false,
    };

    const esClient = createMockEsClient(queryResponse, bulkResponse);
    const handler = new EsqlMaterializeStepHandler(createLogger());

    const result = await handler.run(null, null, {
      esClient,
      with: {
        query: 'FROM sdlc-epic-phases | KEEP entity.id, status',
        target_index: 'sdlc-snapshots',
        id: 'snap',
      },
    });

    expect(result.output).toEqual({
      indexed: 2,
      failed: 0,
      total: 2,
      errors: false,
      items: bulkResponse.items,
    });

    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_query',
      body: { query: 'FROM sdlc-epic-phases | KEEP entity.id, status', format: 'json' },
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      body: [
        { index: { _index: 'sdlc-snapshots', _id: 'snap-0' } },
        { entity_id: 'repo-1', status: 'active' },
        { index: { _index: 'sdlc-snapshots', _id: 'snap-1' } },
        { entity_id: 'repo-2', status: 'stale' },
      ],
    });
  });

  it('returns zero-indexed when query returns no rows', async () => {
    const esClient = createMockEsClient({ columns: [], values: [] }, { items: [] });
    const handler = new EsqlMaterializeStepHandler(createLogger());

    const result = await handler.run(null, null, {
      esClient,
      with: { query: 'FROM empty-index | LIMIT 1', target_index: 'target' },
    });

    expect(result.output).toEqual({ indexed: 0, total: 0 });
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('throws when query is missing', async () => {
    const esClient = createMockEsClient({}, {});
    const handler = new EsqlMaterializeStepHandler(createLogger());

    await expect(
      handler.run(null, null, { esClient, with: { target_index: 'target' } })
    ).rejects.toThrow('query');
  });

  it('throws when target_index is missing', async () => {
    const esClient = createMockEsClient({}, {});
    const handler = new EsqlMaterializeStepHandler(createLogger());

    await expect(handler.run(null, null, { esClient, with: { query: 'FROM x' } })).rejects.toThrow(
      'target_index'
    );
  });

  it('reports partial failures when some bulk items error', async () => {
    const queryResponse = {
      columns: [{ name: 'id', type: 'keyword' }],
      values: [['a'], ['b']],
    };
    const bulkResponse = {
      items: [
        { index: { _index: 'target', _id: 'snap-0', status: 201 } },
        {
          index: {
            _index: 'target',
            _id: 'snap-1',
            status: 400,
            error: { type: 'mapper_error' },
          },
        },
      ],
      errors: true,
    };

    const esClient = createMockEsClient(queryResponse, bulkResponse);
    const logger = createLogger();
    const handler = new EsqlMaterializeStepHandler(logger);

    const result = await handler.run(null, null, {
      esClient,
      with: { query: 'FROM x | KEEP id', target_index: 'target', id: 'snap' },
    });

    expect(result.output).toEqual({
      indexed: 1,
      failed: 1,
      total: 2,
      errors: true,
      items: bulkResponse.items,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});
