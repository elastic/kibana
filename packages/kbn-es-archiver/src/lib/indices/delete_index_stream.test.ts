/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import sinon from 'sinon';

import { createListStream, createPromiseFromStreams } from '@kbn/utils';

import { createDeleteIndexStream } from './delete_index_stream';

import {
  createStubStats,
  createStubClient,
  createStubIndexRecord,
  createStubLogger,
} from './__mocks__/stubs';

const log = createStubLogger();

describe('esArchiver: createDeleteIndexStream()', () => {
  it('deletes the index without checking if it exists', async () => {
    const stats = createStubStats();
    const client = createStubClient([]);

    await createPromiseFromStreams([
      createListStream([createStubIndexRecord('index1')]),
      createDeleteIndexStream(client, stats, log, []),
    ]);

    sinon.assert.notCalled(stats.deletedIndex as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.create as sinon.SinonSpy);
    sinon.assert.calledOnce(client.indices.delete as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.exists as sinon.SinonSpy);
  });

  it('reports the delete when the index existed', async () => {
    const stats = createStubStats();
    const client = createStubClient(['index1']);

    await createPromiseFromStreams([
      createListStream([createStubIndexRecord('index1')]),
      createDeleteIndexStream(client, stats, log, []),
    ]);

    sinon.assert.calledOnce(stats.deletedIndex as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.create as sinon.SinonSpy);
    sinon.assert.calledOnce(client.indices.delete as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.exists as sinon.SinonSpy);
  });
});
