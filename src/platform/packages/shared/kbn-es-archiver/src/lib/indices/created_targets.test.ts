/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import sinon from 'sinon';

import { deleteCreatedTargets } from './created_targets';
import { createStubClient, createStubLogger, createStubStats } from './__mocks__/stubs';

const log = createStubLogger();

const deletedIndices = (client: ReturnType<typeof createStubClient>) =>
  (client.indices.delete as sinon.SinonSpy).args.map(([{ index }]) => index);

describe('esArchiver: deleteCreatedTargets()', () => {
  it('deletes the indices the load created', async () => {
    const client = createStubClient(['new-index', 'other-index']);
    const stats = createStubStats();

    await deleteCreatedTargets({
      client,
      stats,
      log,
      createdTargets: [{ index: 'new-index' }, { index: 'other-index' }],
    });

    expect(deletedIndices(client)).toEqual([['new-index'], ['other-index']]);
    expect(stats.getTestSummary()).toEqual({ deletedIndex: 2 });
  });

  it('deletes the data streams the load created, with their index template', async () => {
    const client = createStubClient();
    const stats = createStubStats();

    await deleteCreatedTargets({
      client,
      stats,
      log,
      createdTargets: [{ dataStream: 'new-data-stream', template: 'new-data-stream-template' }],
    });

    sinon.assert.calledWith(client.indices.deleteDataStream as sinon.SinonSpy, {
      name: 'new-data-stream',
    });
    sinon.assert.calledWith(client.indices.deleteIndexTemplate as sinon.SinonSpy, {
      name: 'new-data-stream-template',
    });
    expect(stats.getTestSummary()).toEqual({ deletedDataStream: 1 });
  });

  it('leaves saved object indices in place', async () => {
    const client = createStubClient(['.kibana_8.17.0_001']);
    const stats = createStubStats();

    await deleteCreatedTargets({
      client,
      stats,
      log,
      createdTargets: [{ index: '.kibana_8.17.0_001' }],
    });

    sinon.assert.notCalled(client.indices.delete as sinon.SinonSpy);
    expect(stats.getTestSummary()).toEqual({});
  });

  it('keeps rolling back the remaining targets when one delete fails', async () => {
    const client = createStubClient(
      ['new-index'],
      {},
      {
        deleteDataStream: async () => {
          throw new Error('cluster is unreachable');
        },
      }
    );
    const stats = createStubStats();

    await deleteCreatedTargets({
      client,
      stats,
      log,
      createdTargets: [
        { dataStream: 'new-data-stream', template: 'new-data-stream-template' },
        { index: 'new-index' },
      ],
    });

    expect(deletedIndices(client)).toEqual([['new-index']]);
    expect(stats.getTestSummary()).toEqual({ deletedIndex: 1 });
  });
});
