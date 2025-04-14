/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mockIsSavedObjectIndex,
  mockCleanSavedObjectIndices,
  mockDeleteSavedObjectIndices,
} from './create_index_stream.test.mock';

import sinon from 'sinon';
import Chance from 'chance';
import { createPromiseFromStreams, createConcatStream, createListStream } from '@kbn/utils';

import { createCreateIndexStream } from './create_index_stream';

import {
  createStubStats,
  createStubIndexRecord,
  createStubDataStreamRecord,
  createStubDocRecord,
  createStubClient,
  createStubLogger,
} from './__mocks__/stubs';

const chance = new Chance();

const log = createStubLogger();

beforeEach(() => {
  mockIsSavedObjectIndex.mockClear();
  mockCleanSavedObjectIndices.mockClear();
  mockDeleteSavedObjectIndices.mockClear();
});

describe('esArchiver: createCreateIndexStream()', () => {
  describe('defaults', () => {
    it('deletes existing indices, creates all', async () => {
      const client = createStubClient(['existing-index']);
      const stats = createStubStats();
      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('existing-index'),
          createStubIndexRecord('new-index'),
        ]),
        createCreateIndexStream({ client, stats, log }),
      ]);

      expect(stats.getTestSummary()).toEqual({
        deletedIndex: 1,
        createdIndex: 2,
      });
      sinon.assert.callCount(client.indices.delete as sinon.SinonSpy, 1);
      sinon.assert.callCount(client.indices.create as sinon.SinonSpy, 3); // one failed create because of existing
    });

    it('deletes existing aliases, creates all', async () => {
      const client = createStubClient(['actual-index'], { 'existing-index': 'actual-index' });
      const stats = createStubStats();
      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('existing-index'),
          createStubIndexRecord('new-index'),
        ]),
        createCreateIndexStream({ client, stats, log }),
      ]);

      expect((client.indices.getAlias as sinon.SinonSpy).args).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "name": Array [
                "existing-index",
              ],
            },
            Object {
              "headers": Object {
                "x-elastic-product-origin": "kibana",
              },
              "ignore": Array [
                404,
              ],
              "meta": true,
            },
          ],
        ]
      `);

      expect((client.indices.delete as sinon.SinonSpy).args).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "index": Array [
                "actual-index",
              ],
            },
            Object {
              "headers": Object {
                "x-elastic-product-origin": "kibana",
              },
            },
          ],
        ]
      `);

      sinon.assert.callCount(client.indices.create as sinon.SinonSpy, 3); // one failed create because of existing
    });

    it('passes through "hit" records', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const output = await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('index'),
          createStubDocRecord('index', 1),
          createStubDocRecord('index', 2),
        ]),
        createCreateIndexStream({ client, stats, log }),
        createConcatStream([]),
      ]);

      expect(output).toEqual([createStubDocRecord('index', 1), createStubDocRecord('index', 2)]);
    });

    it('creates aliases', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('index', { foo: {} }),
          createStubDocRecord('index', 1),
        ]),
        createCreateIndexStream({ client, stats, log }),
        createConcatStream([]),
      ]);

      sinon.assert.calledWith(client.indices.create as sinon.SinonSpy, {
        index: 'index',
        body: {
          settings: undefined,
          mappings: undefined,
        },
      });

      sinon.assert.calledWith(client.indices.updateAliases as sinon.SinonSpy, {
        body: {
          actions: [{ add: { alias: 'foo', index: 'index' } }],
        },
      });
    });

    it('passes through records with unknown types', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const randoms = [
        { type: chance.word(), value: chance.hashtag() },
        { type: chance.word(), value: chance.hashtag() },
      ];

      const output = await createPromiseFromStreams([
        createListStream([createStubIndexRecord('index'), ...randoms]),
        createCreateIndexStream({ client, stats, log }),
        createConcatStream([]),
      ]);

      expect(output).toEqual(randoms);
    });

    it('passes through non-record values', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const nonRecordValues = [undefined, chance.email(), 12345, Infinity, /abc/, new Date()];

      const output = await createPromiseFromStreams([
        createListStream(nonRecordValues),
        createCreateIndexStream({ client, stats, log }),
        createConcatStream([]),
      ]);

      expect(output).toEqual(nonRecordValues);
    });

    it('creates data streams', async () => {
      const client = createStubClient();
      const stats = createStubStats();

      await createPromiseFromStreams([
        createListStream([createStubDataStreamRecord('foo-datastream', 'foo-template')]),
        createCreateIndexStream({ client, stats, log }),
      ]);

      sinon.assert.calledOnce(client.indices.putIndexTemplate as sinon.SinonSpy);
      sinon.assert.calledOnce(client.indices.createDataStream as sinon.SinonSpy);
    });
  });

  describe('deleteSavedObjectIndices', () => {
    function doTest(...indices: string[]) {
      return createPromiseFromStreams([
        createListStream(indices.map((index) => createStubIndexRecord(index))),
        createCreateIndexStream({ client: createStubClient(), stats: createStubStats(), log }),
        createConcatStream([]),
      ]);
    }

    it('does not delete Kibana indices for indexes that do not start with .kibana', async () => {
      await doTest('.foo');

      expect(mockDeleteSavedObjectIndices).not.toHaveBeenCalled();
    });

    it('deletes Kibana indices at most once for indices that start with .kibana', async () => {
      // If we are loading the main Kibana index, we should delete all Kibana indices for backwards compatibility reasons.
      await doTest('.kibana_7.16.0_001', '.kibana_task_manager_7.16.0_001');

      expect(mockDeleteSavedObjectIndices).toHaveBeenCalledTimes(1);
      expect(mockDeleteSavedObjectIndices).toHaveBeenCalledWith(
        expect.not.objectContaining({ index: '.kibana_task_manager_7.16.0_001' })
      );
    });

    it('deletes Kibana task manager index at most once', async () => {
      // If we are loading the Kibana task manager index, we should only delete that index, not any other Kibana indices.
      await doTest('.kibana_task_manager_7.16.0_001', '.kibana_task_manager_7.16.0_002');

      expect(mockDeleteSavedObjectIndices).toHaveBeenCalledTimes(1);
      expect(mockDeleteSavedObjectIndices).toHaveBeenCalledWith(
        expect.objectContaining({ onlyTaskManager: true })
      );
    });

    it('deletes Kibana task manager index AND deletes all Kibana indices', async () => {
      // Because we are reading from a stream, we can't look ahead to see if we'll eventually wind up deleting all Kibana indices.
      // So, we first delete only the Kibana task manager indices, then we wind up deleting all Kibana indices.
      await doTest('.kibana_task_manager_7.16.0_001', '.kibana_7.16.0_001');

      expect(mockDeleteSavedObjectIndices).toHaveBeenCalledTimes(2);
      expect(mockDeleteSavedObjectIndices).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ onlyTaskManager: true })
      );
      expect(mockDeleteSavedObjectIndices).toHaveBeenNthCalledWith(
        2,
        expect.not.objectContaining({ index: expect.any(String) })
      );
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
          createCreateIndexStream({ client, stats, log }),
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
          createCreateIndexStream({ client, stats, log }),
        ]);

        expect(mockCleanSavedObjectIndices).not.toHaveBeenCalled();
      });
    });
  });

  describe('docsOnly = true', () => {
    it('passes through "hit" records without attempting to create indices', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const output = await createPromiseFromStreams([
        createListStream([createStubIndexRecord('index'), createStubDocRecord('index', 1)]),
        createCreateIndexStream({ client, stats, log, docsOnly: true }),
        createConcatStream([]),
      ]);

      sinon.assert.notCalled(client.indices.create as sinon.SinonSpy);
      sinon.assert.notCalled(client.indices.updateAliases as sinon.SinonSpy);
      expect(output).toEqual([createStubDocRecord('index', 1)]);
    });
  });

  describe('skipExisting = true', () => {
    it('ignores preexisting indexes', async () => {
      const client = createStubClient(['existing-index']);
      const stats = createStubStats();

      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('new-index', { 'new-index-alias': {} }),
          createStubIndexRecord('existing-index', { 'existing-index-alias': {} }),
        ]),
        createCreateIndexStream({
          client,
          stats,
          log,
          skipExisting: true,
        }),
      ]);

      expect(stats.getTestSummary()).toEqual({
        skippedIndex: 1,
        createdIndex: 1,
      });
      sinon.assert.callCount(client.indices.delete as sinon.SinonSpy, 0);
      sinon.assert.callCount(client.indices.create as sinon.SinonSpy, 2); // one failed create because of existing
      expect((client.indices.create as sinon.SinonSpy).args[0][0]).toHaveProperty(
        'index',
        'new-index'
      );

      // only update aliases for the 'new-index'
      sinon.assert.callCount(client.indices.updateAliases as sinon.SinonSpy, 1);
      expect((client.indices.updateAliases as sinon.SinonSpy).args[0][0]).toHaveProperty('body', {
        actions: [{ add: { alias: 'new-index-alias', index: 'new-index' } }],
      });
    });

    it('filters documents for skipped indices', async () => {
      const client = createStubClient(['existing-index']);
      const stats = createStubStats();

      const output = await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('new-index'),
          createStubDocRecord('new-index', 1),
          createStubDocRecord('new-index', 2),
          createStubIndexRecord('existing-index'),
          createStubDocRecord('existing-index', 1),
          createStubDocRecord('existing-index', 2),
        ]),
        createCreateIndexStream({
          client,
          stats,
          log,
          skipExisting: true,
        }),
        createConcatStream([]),
      ]);

      expect(stats.getTestSummary()).toEqual({
        skippedIndex: 1,
        createdIndex: 1,
      });
      sinon.assert.callCount(client.indices.delete as sinon.SinonSpy, 0);
      sinon.assert.callCount(client.indices.create as sinon.SinonSpy, 2); // one failed create because of existing

      expect(output).toHaveLength(2);
      expect(output).toEqual([
        createStubDocRecord('new-index', 1),
        createStubDocRecord('new-index', 2),
      ]);
    });
  });
});
