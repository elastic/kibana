/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { MigrationContext } from './context';
import { migrateIndex } from './migrate_index';
import {
  KIBANA_VERSION,
  SERVERLESS_INPUTS,
  createTestContext,
  fetchIndicesResponse,
  indexMappingsWith,
} from './test_helpers/context';
import {
  createIOStub,
  getVisitedStates,
  retryableError,
  success,
  type IOStub,
} from './test_helpers/io';

const outdatedFooDoc = (id: string, title = 'a'): SavedObjectsRawDoc => ({
  _id: `foo:${id}`,
  _seq_no: 1,
  _primary_term: 1,
  _source: {
    type: 'foo',
    foo: { title },
    references: [],
    typeMigrationVersion: '10.1.0',
    coreMigrationVersion: '8.8.0',
  },
});

describe('migrateIndex', () => {
  let logger: MockedLogger;

  const run = (context: MigrationContext, io: IOStub) => migrateIndex({ context, io, logger });

  beforeEach(() => {
    logger = loggerMock.create();
  });

  describe('on a fresh cluster', () => {
    it('creates the index with its aliases, after checking the cluster routing allocation', async () => {
      const context = createTestContext();
      const io = createIOStub(context);

      await expect(run(context, io)).resolves.toEqual({
        status: 'patched',
        alias: '.kibana',
        destIndex: '.kibana_1',
        elapsedMs: expect.any(Number),
      });
      expect(getVisitedStates(logger)).toEqual([
        'INIT',
        'CHECK_CLUSTER_ROUTING_ALLOCATION',
        'CREATE_TARGET_INDEX',
        'DONE',
      ]);
      expect(io.createIndex).toHaveBeenCalledWith('.kibana_1', [
        '.kibana',
        `.kibana_${KIBANA_VERSION}`,
      ]);
    });

    it('does not check the cluster routing allocation on serverless', async () => {
      const context = createTestContext({ inputs: SERVERLESS_INPUTS });
      const io = createIOStub(context);

      await run(context, io);
      expect(getVisitedStates(logger)).toEqual(['INIT', 'CREATE_TARGET_INDEX', 'DONE']);
      expect(io.checkClusterRoutingAllocation).not.toHaveBeenCalled();
    });

    it('updates the index created by a concurrent migrator', async () => {
      const context = createTestContext({ inputs: SERVERLESS_INPUTS });
      const io = createIOStub(context);
      io.createIndex.mockResolvedValueOnce(success('index_already_exists'));
      io.fetchIndices
        .mockResolvedValueOnce(success({}))
        .mockResolvedValue(success(fetchIndicesResponse({ mappings: context.indexMappings })));

      await expect(run(context, io)).resolves.toMatchObject({ destIndex: '.kibana_1' });
      expect(getVisitedStates(logger)).toEqual([
        'INIT',
        'CREATE_TARGET_INDEX',
        'INIT',
        'INDEX_STATE_UPDATE_DONE',
        'DONE',
      ]);
    });
  });

  it('does not write anything when the index is up to date', async () => {
    const context = createTestContext();
    const io = createIOStub(context, {
      indices: fetchIndicesResponse({ mappings: context.indexMappings }),
    });

    await expect(run(context, io)).resolves.toMatchObject({ destIndex: '.kibana_1' });
    expect(getVisitedStates(logger)).toEqual(['INIT', 'INDEX_STATE_UPDATE_DONE', 'DONE']);
    [
      io.createIndex,
      io.updateMappings,
      io.updateIndexMeta,
      io.updateAliases,
      io.cleanupUnknownAndExcludedDocs,
      io.bulkIndex,
    ].forEach((write) => expect(write).not.toHaveBeenCalled());
  });

  describe('on an upgrade with new model versions', () => {
    const context = createTestContext();
    const previousMappings = indexMappingsWith(context, {
      mappingVersions: { foo: '10.1.0', bar: '10.1.0' },
      docVersions: { foo: '10.1.0', bar: '10.1.0' },
      migrationState: { convertingDocumentsSince: 0 } as never,
    });
    const createUpgradeIO = (outdatedDocuments: SavedObjectsRawDoc[]) =>
      createIOStub(context, {
        indices: fetchIndicesResponse({
          aliases: ['.kibana', '.kibana_9.3.0'],
          mappings: previousMappings,
        }),
        outdatedDocuments,
      });

    it('updates the index, then converts the outdated documents', async () => {
      const io = createUpgradeIO([outdatedFooDoc('1')]);

      await expect(run(context, io)).resolves.toMatchObject({ destIndex: '.kibana_1' });
      expect(getVisitedStates(logger)).toEqual([
        'INIT',
        'CHECK_CLUSTER_ROUTING_ALLOCATION',
        'WAIT_FOR_YELLOW_SOURCE',
        'UPDATE_INDEX_MAPPINGS',
        'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
        'UPDATE_MAPPING_MODEL_VERSIONS',
        'UPDATE_ALIASES',
        'INDEX_STATE_UPDATE_DONE',
        'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS',
        'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
        'OUTDATED_DOCUMENTS_SEARCH_READ',
        'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM',
        'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX',
        'OUTDATED_DOCUMENTS_SEARCH_READ',
        'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
        'OUTDATED_DOCUMENTS_SEARCH_REFRESH',
        'UPDATE_DOCUMENT_MODEL_VERSIONS',
        'DONE',
      ]);

      const [[, operations]] = io.bulkIndex.mock.calls;
      expect(operations).toEqual([
        [
          { index: { _id: 'foo:1', if_seq_no: 1, if_primary_term: 1 } },
          expect.objectContaining({
            type: 'foo',
            foo: { title: 'a', description: 'backfilled' },
            typeMigrationVersion: '10.2.0',
          }),
        ],
      ]);
      expect(io.closePit).toHaveBeenCalledWith('pit-id');
    });

    it('merges the model versions into the existing _meta, preserving the fields it does not own', async () => {
      const io = createUpgradeIO([]);
      await run(context, io);

      const [[, updateMappingVersions], [, updateDocVersions]] = io.updateIndexMeta.mock.calls;
      const afterMappings = updateMappingVersions(previousMappings._meta ?? {});
      expect(afterMappings).toEqual({
        ...previousMappings._meta,
        mappingVersions: context.typeVirtualVersions,
      });
      expect(updateDocVersions(afterMappings)).toEqual({
        ...afterMappings,
        docVersions: context.typeVirtualVersions,
      });
    });

    it('moves the version aliases to this version', async () => {
      const io = createUpgradeIO([]);
      await run(context, io);

      expect(io.updateAliases).toHaveBeenCalledWith([
        { add: { index: '.kibana_1', alias: `.kibana_${KIBANA_VERSION}` } },
        { remove: { index: '.kibana_1', alias: '.kibana_9.3.0', must_exist: false } },
      ]);
    });

    it('does not refresh the index when no document was converted', async () => {
      const io = createUpgradeIO([]);
      await run(context, io);

      expect(getVisitedStates(logger)).not.toContain('OUTDATED_DOCUMENTS_SEARCH_REFRESH');
      expect(io.refreshIndex).not.toHaveBeenCalled();
    });
  });

  describe('when documents cannot be converted', () => {
    // the id doesn't match the type prefix
    const corruptDoc: SavedObjectsRawDoc = {
      _id: 'corrupt',
      _source: { type: 'foo', typeMigrationVersion: '10.1.0' },
    };
    const outdatedIndex = (context: MigrationContext) =>
      fetchIndicesResponse({
        mappings: indexMappingsWith(context, { docVersions: { foo: '10.1.0', bar: '10.1.0' } }),
      });

    it('fails, listing the corrupt documents, and closes the point-in-time', async () => {
      const context = createTestContext();
      const io = createIOStub(context, {
        indices: outdatedIndex(context),
        outdatedDocuments: [corruptDoc, outdatedFooDoc('1')],
      });

      await expect(run(context, io)).rejects.toThrow(
        /Unable to complete saved object migrations for the \[\.kibana\] index: Migrations failed\. .*corrupt/s
      );
      expect(io.bulkIndex).not.toHaveBeenCalled();
      expect(io.closePit).toHaveBeenCalledWith('pit-id');
    });

    it('discards them, and converts the rest, when allowed to', async () => {
      const context = createTestContext({ migrationConfig: { discardCorruptObjects: true } });
      const io = createIOStub(context, {
        indices: outdatedIndex(context),
        outdatedDocuments: [corruptDoc, outdatedFooDoc('1')],
      });

      await expect(run(context, io)).resolves.toMatchObject({ destIndex: '.kibana_1' });
      const [[, operations]] = io.bulkIndex.mock.calls;
      expect(operations).toEqual([
        [
          expect.objectContaining({ index: expect.objectContaining({ _id: 'foo:1' }) }),
          expect.anything(),
        ],
        { delete: { _id: 'corrupt' } },
      ]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('corrupt'));
    });
  });

  describe('on Elasticsearch errors', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('retries retryable errors, with a delay', async () => {
      const context = createTestContext();
      const io = createIOStub(context);
      io.fetchIndices.mockResolvedValueOnce(retryableError()).mockResolvedValue(success({}));

      const migration = run(context, io);
      await jest.advanceTimersByTimeAsync(2000);

      await expect(migration).resolves.toMatchObject({ destIndex: '.kibana_1' });
      expect(getVisitedStates(logger)).toEqual([
        'INIT',
        'INIT',
        'CHECK_CLUSTER_ROUTING_ALLOCATION',
        'CREATE_TARGET_INDEX',
        'DONE',
      ]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          "Action failed with 'es is unavailable'. Retrying attempt 1 in 2 seconds."
        )
      );
    });

    it('fails once the retry attempts are exhausted', async () => {
      const context = createTestContext({ migrationConfig: { retryAttempts: 2 } });
      const io = createIOStub(context);
      io.fetchIndices.mockResolvedValue(retryableError());

      const migration = run(context, io);
      const assertion = expect(migration).rejects.toThrow(
        /Unable to complete the INIT step after 2 attempts, terminating\. The last failure message was: es is unavailable/
      );
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;
    });

    it('closes the point-in-time when an unexpected error is thrown', async () => {
      const context = createTestContext();
      const io = createIOStub(context, {
        indices: fetchIndicesResponse({
          mappings: indexMappingsWith(context, { docVersions: { foo: '10.1.0', bar: '10.1.0' } }),
        }),
      });
      io.readWithPit.mockReset().mockRejectedValue(new Error('boom'));

      await expect(run(context, io)).rejects.toThrow(
        'Unable to complete saved object migrations for the [.kibana] index. Error: boom'
      );
      expect(io.closePit).toHaveBeenCalledWith('pit-id');
    });
  });

  describe('when this node waits for another one to perform the migration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('polls until the index is up to date, without writing', async () => {
      const context = createTestContext({
        inputs: { waitForMigrationCompletion: true, migrateDocuments: false },
      });
      const io = createIOStub(context);
      io.fetchIndices
        .mockResolvedValueOnce(success({}))
        .mockResolvedValueOnce(success({}))
        .mockResolvedValue(success(fetchIndicesResponse({ mappings: context.indexMappings })));

      const migration = run(context, io);
      await jest.advanceTimersByTimeAsync(4000);

      await expect(migration).resolves.toMatchObject({ destIndex: '.kibana_1' });
      expect(getVisitedStates(logger)).toEqual([
        'INIT',
        'WAIT_FOR_MIGRATION_COMPLETION',
        'WAIT_FOR_MIGRATION_COMPLETION',
        'DONE',
      ]);
      expect(io.createIndex).not.toHaveBeenCalled();
    });
  });
});
