/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  pointInTimeFinderMock,
  mockInternalBulkResolve,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';
import { type BulkResolveError } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  mockTimestamp,
  mappings,
  createRegistry,
  createDocumentMigrator,
  createSpySerializer,
} from '../../test_helpers/repository.test.common';

describe('SavedObjectsRepository', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  beforeEach(() => {
    pointInTimeFinderMock.mockClear();
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    logger = loggerMock.create();

    // create a mock serializer "shim" so we can track function calls, but use the real serializer's implementation
    serializer = createSpySerializer(registry);

    const allTypes = registry.getAllTypes().map((type) => type.name);
    const allowedTypes = [...new Set(allTypes.filter((type) => !registry.isHidden(type)))];

    // @ts-expect-error must use the private constructor to use the mocked serializer
    repository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes,
      logger,
    });

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();
  });

  describe('#resolve', () => {
    afterEach(() => {
      mockInternalBulkResolve.mockReset();
    });

    it('passes arguments to the internalBulkResolve module and returns the result', async () => {
      const expectedResult: SavedObjectsResolveResponse = {
        saved_object: { type: 'type', id: 'id', attributes: {}, references: [] },
        outcome: 'exactMatch',
      };
      mockInternalBulkResolve.mockResolvedValue({ resolved_objects: [expectedResult] });

      await expect(repository.resolve('obj-type', 'obj-id')).resolves.toEqual(expectedResult);
      expect(mockInternalBulkResolve).toHaveBeenCalledTimes(1);
      expect(mockInternalBulkResolve).toHaveBeenCalledWith(
        expect.objectContaining({ objects: [{ type: 'obj-type', id: 'obj-id' }] }),
        expect.any(Object)
      );
    });

    it('throws when internalBulkResolve result is an error', async () => {
      const error = SavedObjectsErrorHelpers.decorateBadRequestError(new Error('Oh no!'));
      const expectedResult: BulkResolveError = { type: 'obj-type', id: 'obj-id', error };
      mockInternalBulkResolve.mockResolvedValue({ resolved_objects: [expectedResult] });

      await expect(repository.resolve('foo', '2')).rejects.toEqual(error);
    });

    it('throws when internalBulkResolve throws', async () => {
      const error = new Error('Oh no!');
      mockInternalBulkResolve.mockRejectedValue(error);

      await expect(repository.resolve('foo', '2')).rejects.toEqual(error);
    });
  });
});
