/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockCleanSavedObjectIndices } from './create_index_stream.test.mock';

import sinon from 'sinon';

import { createListStream, createPromiseFromStreams } from '@kbn/utils';

import { createDeleteIndexStream } from './delete_index_stream';

import {
  createStubStats,
  createStubClient,
  createStubIndexRecord,
  createStubDataStreamRecord,
  createStubLogger,
  createStubDocRecord,
} from './__mocks__/stubs';

const log = createStubLogger();

beforeEach(() => {
  mockCleanSavedObjectIndices.mockClear();
});

describe('esArchiver: createDeleteIndexStream()', () => {
  it('deletes the index without checking if it exists', async () => {
    const stats = createStubStats();
    const client = createStubClient([]);

    await createPromiseFromStreams([
      createListStream([createStubIndexRecord('index1')]),
      createDeleteIndexStream(client, stats, log),
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
      createDeleteIndexStream(client, stats, log),
    ]);

    sinon.assert.calledOnce(stats.deletedIndex as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.create as sinon.SinonSpy);
    sinon.assert.calledOnce(client.indices.delete as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.exists as sinon.SinonSpy);
  });

  it('deletes data streams', async () => {
    const stats = createStubStats();
    const client = createStubClient([]);

    await createPromiseFromStreams([
      createListStream([createStubDataStreamRecord('foo-datastream', 'foo-template')]),
      createDeleteIndexStream(client, stats, log),
    ]);

    sinon.assert.calledOnce(stats.deletedDataStream as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.create as sinon.SinonSpy);
    sinon.assert.calledOnce(client.indices.deleteDataStream as sinon.SinonSpy);
    sinon.assert.calledWith(client.indices.deleteDataStream as sinon.SinonSpy, {
      name: 'foo-datastream',
    });
    sinon.assert.calledOnce(client.indices.deleteIndexTemplate as sinon.SinonSpy);
    sinon.assert.calledWith(client.indices.deleteIndexTemplate as sinon.SinonSpy, {
      name: 'foo-template',
    });
  });

  describe('saved object cleanup', () => {
    describe('when saved object documents are found', () => {
      it('cleans the corresponding saved object indices', async () => {
        const client = createStubClient();
        const stats = createStubStats();
        await createPromiseFromStreams([
          createListStream([
            createStubDocRecord('.kibana_task_manager', 1),
            createStubDocRecord('.kibana_alerting_cases', 2),
            createStubDocRecord('.kibana', 3),
          ]),
          createDeleteIndexStream(client, stats, log),
        ]);

        expect(mockCleanSavedObjectIndices).toHaveBeenCalledTimes(2);

        expect(mockCleanSavedObjectIndices).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ index: '.kibana_task_manager' })
        );
        expect(mockCleanSavedObjectIndices).toHaveBeenNthCalledWith(
          2,
          expect.not.objectContaining({ index: expect.any(String) })
        );
      });
    });

    describe('when saved object documents are not found', () => {
      it('does not clean any indices', async () => {
        const client = createStubClient();
        const stats = createStubStats();
        await createPromiseFromStreams([
          createListStream([
            createStubDocRecord('.foo', 1),
            createStubDocRecord('.bar', 2),
            createStubDocRecord('.baz', 3),
          ]),
          createDeleteIndexStream(client, stats, log),
        ]);

        expect(mockCleanSavedObjectIndices).not.toHaveBeenCalled();
      });
    });
  });
});
