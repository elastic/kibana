/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import sinon from 'sinon';

import { deleteCreatedTargets } from './delete_created_targets';
import { createStubClient, createStubLogger, createStubStats } from './__mocks__/stubs';

const log = createStubLogger();

const deletedIndices = (client: ReturnType<typeof createStubClient>) =>
  (client.indices.delete as sinon.SinonSpy).args.map(([{ index }]) => index);

describe('esArchiver: deleteCreatedTargets()', () => {
  it('deletes the created indices and data streams', async () => {
    const client = createStubClient(['created-index', 'untouched-index']);
    const stats = createStubStats();

    await deleteCreatedTargets({
      client,
      stats,
      log,
      targets: [
        { type: 'index', name: 'created-index' },
        { type: 'data_stream', name: 'created-data-stream', template: 'created-template' },
      ],
    });

    expect(deletedIndices(client)).toEqual([['created-index']]);
    expect((client.indices.deleteDataStream as sinon.SinonSpy).args).toEqual([
      [{ name: 'created-data-stream' }],
    ]);
    expect((client.indices.deleteIndexTemplate as sinon.SinonSpy).args).toEqual([
      [{ name: 'created-template' }],
    ]);
    expect(stats.getTestSummary()).toEqual({ deletedIndex: 1, deletedDataStream: 1 });
  });

  it('deletes the remaining targets when one deletion fails', async () => {
    const client = createStubClient(['second-index']);
    const stats = createStubStats();
    client.indices.delete = sinon.spy(async ({ index }: { index: string[] }) => {
      if (index.includes('first-index')) {
        throw new Error('cluster is unavailable');
      }
      return { body: { ok: true } };
    }) as typeof client.indices.delete;

    await deleteCreatedTargets({
      client,
      stats,
      log,
      targets: [
        { type: 'index', name: 'first-index' },
        { type: 'index', name: 'second-index' },
      ],
    });

    expect(deletedIndices(client)).toEqual([['first-index'], ['second-index']]);
    expect(stats.getTestSummary()).toEqual({ deletedIndex: 1 });
  });
});
