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
import { kibanaMigratorMock } from '../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  mockTimestamp,
  createRegistry,
  createDocumentMigrator,
} from '../test_helpers/repository.test.common';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { ISavedObjectsSpacesExtension } from '@kbn/core-saved-objects-server';
import { savedObjectsExtensionsMock } from '../mocks/saved_objects_extensions.mock';

describe('SavedObjectsRepository', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: ISavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;

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

    repository = SavedObjectsRepository.createRepository(
      migrator,
      registry,
      '.kibana-test',
      client,
      logger
    );

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

  describe('#asScopedToNamespace', () => {
    it('returns a new client with undefined spacesExtensions (not available)', () => {
      const scopedRepository = repository.asScopedToNamespace('space-a');
      expect(scopedRepository).toBeInstanceOf(SavedObjectsRepository);
      expect(scopedRepository).not.toStrictEqual(repository);

      // Checking extensions.spacesExtension are both undefined
      // @ts-expect-error type is ISavedObjectsRepository, but in reality is SavedObjectsRepository
      expect(repository.extensions.spacesExtension).toBeUndefined();
      // @ts-expect-error type is ISavedObjectsRepository, but in reality is SavedObjectsRepository
      expect(scopedRepository.extensions.spacesExtension).toBeUndefined();
      // @ts-expect-error type is ISavedObjectsRepository, but in reality is SavedObjectsRepository
      expect(scopedRepository.extensions.spacesExtension).toStrictEqual(
        // @ts-expect-error type is ISavedObjectsRepository, but in reality is SavedObjectsRepository
        repository.extensions.spacesExtension
      );
    });
  });

  describe('with spacesExtension', () => {
    let spacesExtension: jest.Mocked<ISavedObjectsSpacesExtension>;

    beforeEach(() => {
      spacesExtension = savedObjectsExtensionsMock.createSpacesExtension();
      repository = SavedObjectsRepository.createRepository(
        migrator,
        registry,
        '.kibana-test',
        client,
        logger,
        [],
        { spacesExtension }
      );
    });

    describe('#asScopedToNamespace', () => {
      it('returns a new client with space-scoped spacesExtensions', () => {
        const scopedRepository = repository.asScopedToNamespace('space-a');
        expect(scopedRepository).toBeInstanceOf(SavedObjectsRepository);
        expect(scopedRepository).not.toStrictEqual(repository);
        expect(spacesExtension.asScopedToNamespace).toHaveBeenCalledWith('space-a');

        // Checking extensions.spacesExtension are both defined but different
        // @ts-expect-error type is ISavedObjectsRepository, but in reality is SavedObjectsRepository
        expect(repository.extensions.spacesExtension).not.toBeUndefined();
        // @ts-expect-error type is ISavedObjectsRepository, but in reality is SavedObjectsRepository
        expect(scopedRepository.extensions.spacesExtension).not.toBeUndefined();
        // @ts-expect-error type is ISavedObjectsRepository, but in reality is SavedObjectsRepository
        expect(scopedRepository.extensions.spacesExtension).not.toStrictEqual(
          // @ts-expect-error type is ISavedObjectsRepository, but in reality is SavedObjectsRepository
          repository.extensions.spacesExtension
        );
      });
    });
  });
});
