/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';

import { disableAllWorkflows } from './workflow_disable_all';

const logger = loggerMock.create();

const makeHit = (id: string, enabled = true) => ({
  _id: id,
  _source: {
    name: `Workflow ${id}`,
    description: '',
    enabled,
    tags: [],
    triggerTypes: [],
    yaml: `name: Workflow ${id}\nenabled: ${enabled}`,
    definition: null,
    createdBy: 'user1',
    lastUpdatedBy: 'user1',
    spaceId: 'default',
    valid: true,
    deleted_at: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  sort: [id],
});

const makeStorageClient = (pages: Array<Array<ReturnType<typeof makeHit>>>) => {
  const searchMock = jest.fn();
  pages.forEach((hits) => {
    searchMock.mockResolvedValueOnce({ hits: { hits } });
  });
  // Empty page to terminate pagination
  searchMock.mockResolvedValue({ hits: { hits: [] } });

  const bulkMock = jest.fn().mockImplementation(({ operations }) => {
    const items = operations
      .filter((op: Record<string, unknown>) => 'index' in op)
      .map((op: { index: { _id: string } }) => ({
        index: { _id: op.index._id, status: 200 },
      }));
    return Promise.resolve({ items });
  });

  const mockClient = { search: searchMock, bulk: bulkMock };
  return {
    client: mockClient,
    storage: { getClient: () => mockClient } as any,
  };
};

describe('disableAllWorkflows', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns zero counts when no enabled workflows exist', async () => {
    const { storage } = makeStorageClient([[]]);

    const result = await disableAllWorkflows({
      storage,
      taskScheduler: null,
      logger,
    });

    expect(result).toEqual({ total: 0, disabled: 0, failures: [] });
  });

  it('disables workflows in a single page', async () => {
    const { storage, client } = makeStorageClient([[makeHit('wf-1'), makeHit('wf-2')]]);

    const result = await disableAllWorkflows({
      storage,
      taskScheduler: null,
      logger,
    });

    expect(result.total).toBe(2);
    expect(result.disabled).toBe(2);
    expect(result.failures).toEqual([]);
    expect(client.bulk).toHaveBeenCalledTimes(1);
  });

  it('patches YAML to set enabled: false', async () => {
    const { storage, client } = makeStorageClient([[makeHit('wf-1')]]);

    await disableAllWorkflows({ storage, taskScheduler: null, logger });

    const bulkOps = client.bulk.mock.calls[0][0].operations;
    const doc = bulkOps[0].index.document;
    expect(doc.enabled).toBe(false);
    expect(doc.yaml).toContain('enabled: false');
  });

  it('collects failures from partial bulk errors', async () => {
    const { storage, client } = makeStorageClient([[makeHit('wf-1'), makeHit('wf-2')]]);
    client.bulk.mockResolvedValueOnce({
      items: [
        { index: { _id: 'wf-1', status: 200 } },
        { index: { _id: 'wf-2', status: 400, error: { type: 'err', reason: 'bulk fail' } } },
      ],
    });

    const result = await disableAllWorkflows({ storage, taskScheduler: null, logger });

    expect(result.disabled).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].id).toBe('wf-2');
  });

  it('logs info message with counts', async () => {
    const { storage } = makeStorageClient([[makeHit('wf-1')]]);

    await disableAllWorkflows({ storage, taskScheduler: null, logger });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Disabled 1 workflows'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('across all spaces'));
  });

  it('omits the spaceId filter from the query when no spaceId is provided', async () => {
    const { storage, client } = makeStorageClient([[]]);

    await disableAllWorkflows({ storage, taskScheduler: null, logger });

    const searchQuery = client.search.mock.calls[0][0].query;
    expect(searchQuery.bool.must).toEqual([{ term: { enabled: true } }]);
  });

  it('scopes the query to the provided spaceId and reports it in the log message', async () => {
    const { storage, client } = makeStorageClient([[makeHit('wf-1')]]);

    await disableAllWorkflows({ storage, taskScheduler: null, logger, spaceId: 'my-space' });

    const searchQuery = client.search.mock.calls[0][0].query;
    expect(searchQuery.bool.must).toEqual([
      { term: { enabled: true } },
      { term: { spaceId: 'my-space' } },
    ]);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('in space my-space'));
  });
});
