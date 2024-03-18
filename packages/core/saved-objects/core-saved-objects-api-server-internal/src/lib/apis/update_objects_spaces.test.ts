/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  pointInTimeFinderMock,
  mockUpdateObjectsSpaces,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type {
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
} from '@kbn/core-saved-objects-api-server';
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

describe('#updateObjectsSpaces', () => {
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

  describe('performUpdateObjectsSpaces', () => {
    afterEach(() => {
      mockUpdateObjectsSpaces.mockReset();
    });

    it('passes arguments to the updateObjectsSpaces module and returns the result', async () => {
      const objects: SavedObjectsUpdateObjectsSpacesObject[] = [{ type: 'type', id: 'id' }];
      const spacesToAdd = ['to-add', 'also-to-add'];
      const spacesToRemove = ['to-remove'];
      const options: SavedObjectsUpdateObjectsSpacesOptions = { namespace: 'ns-1' };
      const expectedResult: SavedObjectsUpdateObjectsSpacesResponse = {
        objects: [
          {
            type: 'type',
            id: 'id',
            spaces: ['foo', 'bar'],
          },
        ],
      };
      mockUpdateObjectsSpaces.mockResolvedValue(expectedResult);

      await expect(
        repository.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options)
      ).resolves.toEqual(expectedResult);
      expect(mockUpdateObjectsSpaces).toHaveBeenCalledTimes(1);
      expect(mockUpdateObjectsSpaces).toHaveBeenCalledWith(
        expect.objectContaining({ objects, spacesToAdd, spacesToRemove, options })
      );
    });

    it('returns an error from the updateObjectsSpaces module', async () => {
      const expectedResult = new Error('Oh no!');
      mockUpdateObjectsSpaces.mockRejectedValue(expectedResult);

      await expect(repository.updateObjectsSpaces([], [], [])).rejects.toEqual(expectedResult);
    });
  });
});
