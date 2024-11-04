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
  mockGetCurrentTime,
  mockGetSearchDsl,
} from './repository.test.mock';

import { SavedObjectsRepository } from './repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  mockTimestamp,
  mappings,
  createRegistry,
  createDocumentMigrator,
  createSpySerializer,
} from '../test_helpers/repository.test.common';

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

  describe('#getCurrentNamespace', () => {
    it('returns `undefined` for `undefined` namespace argument', async () => {
      expect(repository.getCurrentNamespace()).toBeUndefined();
    });

    it('throws if `*` namespace argument is provided', async () => {
      expect(() => repository.getCurrentNamespace('*')).toThrowErrorMatchingInlineSnapshot(
        `"\\"options.namespace\\" cannot be \\"*\\": Bad Request"`
      );
    });

    it('properly handles `default` namespace', async () => {
      expect(repository.getCurrentNamespace('default')).toBeUndefined();
    });

    it('properly handles non-`default` namespace', async () => {
      expect(repository.getCurrentNamespace('space-a')).toBe('space-a');
    });
  });
});
