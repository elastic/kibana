/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  pointInTimeFinderMock,
  mockInternalBulkResolve,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

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

describe('#bulkResolve', () => {
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

  describe('performBulkResolve', () => {
    afterEach(() => {
      mockInternalBulkResolve.mockReset();
    });

    it('passes arguments to the internalBulkResolve module and returns the expected results', async () => {
      mockInternalBulkResolve.mockResolvedValue({
        resolved_objects: [
          {
            saved_object: { type: 'mock', id: 'mock-object', attributes: {}, references: [] },
            outcome: 'exactMatch',
          },
          {
            type: 'obj-type',
            id: 'obj-id-2',
            error: SavedObjectsErrorHelpers.createGenericNotFoundError('obj-type', 'obj-id-2'),
          },
        ],
      });

      const objects = [
        { type: 'obj-type', id: 'obj-id-1' },
        { type: 'obj-type', id: 'obj-id-2' },
      ];
      await expect(repository.bulkResolve(objects)).resolves.toEqual({
        resolved_objects: [
          {
            saved_object: { type: 'mock', id: 'mock-object', attributes: {}, references: [] },
            outcome: 'exactMatch',
          },
          {
            saved_object: {
              type: 'obj-type',
              id: 'obj-id-2',
              error: {
                error: 'Not Found',
                message: 'Saved object [obj-type/obj-id-2] not found',
                statusCode: 404,
              },
            },
            outcome: 'exactMatch',
          },
        ],
      });
      expect(mockInternalBulkResolve).toHaveBeenCalledTimes(1);
      expect(mockInternalBulkResolve).toHaveBeenCalledWith(
        expect.objectContaining({ objects }),
        expect.any(Object)
      );
    });

    it('throws when internalBulkResolve throws', async () => {
      const error = new Error('Oh no!');
      mockInternalBulkResolve.mockRejectedValue(error);

      await expect(repository.resolve('some-type', 'some-id')).rejects.toEqual(error);
    });
  });
});
