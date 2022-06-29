/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../../../elasticsearch';
import type * as SavedObjectsRepositoryType from './repository';
import { SavedObjectsRepository } from './repository';
import { kibanaMigratorMock } from '../../migrations/kibana_migrator.mock';
import { KibanaMigrator } from '../../migrations';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';

jest.mock('./repository');

const { SavedObjectsRepository: originalRepository } =
  jest.requireActual<typeof SavedObjectsRepositoryType>('./repository');

describe('SavedObjectsRepository#createRepository', () => {
  let logger: MockedLogger;
  const callAdminCluster = jest.fn() as unknown as ElasticsearchClient;

  const typeRegistry = new SavedObjectTypeRegistry();
  typeRegistry.registerType({
    name: 'nsAgnosticType',
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      properties: {
        name: { type: 'keyword' },
      },
    },
    migrations: {},
  });

  typeRegistry.registerType({
    name: 'nsType',
    hidden: false,
    namespaceType: 'single',
    indexPattern: 'beats',
    mappings: {
      properties: {
        name: { type: 'keyword' },
      },
    },
    migrations: {},
  });
  typeRegistry.registerType({
    name: 'hiddenType',
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      properties: {
        name: { type: 'keyword' },
      },
    },
    migrations: {},
  });

  const migrator = kibanaMigratorMock.create({ types: typeRegistry.getAllTypes() });
  const RepositoryConstructor =
    SavedObjectsRepository as unknown as jest.Mock<SavedObjectsRepository>;

  beforeEach(() => {
    logger = loggerMock.create();
    RepositoryConstructor.mockClear();
  });

  it('should not allow a repository with an undefined type', () => {
    try {
      originalRepository.createRepository(
        migrator as unknown as KibanaMigrator,
        typeRegistry,
        '.kibana-test',
        callAdminCluster,
        logger,
        ['unMappedType1', 'unmappedType2']
      );
    } catch (e) {
      expect(e).toMatchInlineSnapshot(
        `[Error: Missing mappings for saved objects types: 'unMappedType1, unmappedType2']`
      );
    }
  });

  it('should create a repository without hidden types', () => {
    const repository = originalRepository.createRepository(
      migrator as unknown as KibanaMigrator,
      typeRegistry,
      '.kibana-test',
      callAdminCluster,
      logger,
      [],
      { encryptionExtension: undefined, securityExtension: undefined, spacesExtension: undefined },
      SavedObjectsRepository
    );
    expect(repository).toBeDefined();
    expect(RepositoryConstructor.mock.calls[0][0].allowedTypes).toMatchInlineSnapshot(`
      Array [
        "nsAgnosticType",
        "nsType",
      ]
    `);
  });

  it('should create a repository with a unique list of hidden types', () => {
    const repository = originalRepository.createRepository(
      migrator as unknown as KibanaMigrator,
      typeRegistry,
      '.kibana-test',
      callAdminCluster,
      logger,
      ['hiddenType', 'hiddenType', 'hiddenType'],
      { encryptionExtension: undefined, securityExtension: undefined, spacesExtension: undefined },
      SavedObjectsRepository
    );
    expect(repository).toBeDefined();
    expect(RepositoryConstructor.mock.calls[0][0].allowedTypes).toMatchInlineSnapshot(`
      Array [
        "nsAgnosticType",
        "nsType",
        "hiddenType",
      ]
    `);
  });
});
