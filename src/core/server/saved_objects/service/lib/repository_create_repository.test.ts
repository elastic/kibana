/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsRepository } from './repository';
import { mockKibanaMigrator } from '../../migrations/kibana/kibana_migrator.mock';
import { KibanaMigrator } from '../../migrations';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';

jest.mock('./repository');

const { SavedObjectsRepository: originalRepository } = jest.requireActual('./repository');

describe('SavedObjectsRepository#createRepository', () => {
  const callAdminCluster = jest.fn();

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

  const migrator = mockKibanaMigrator.create({ types: typeRegistry.getAllTypes() });
  const RepositoryConstructor = (SavedObjectsRepository as unknown) as jest.Mock<SavedObjectsRepository>;

  beforeEach(() => {
    RepositoryConstructor.mockClear();
  });

  it('should not allow a repository with an undefined type', () => {
    try {
      originalRepository.createRepository(
        (migrator as unknown) as KibanaMigrator,
        typeRegistry,
        '.kibana-test',
        callAdminCluster,
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
      (migrator as unknown) as KibanaMigrator,
      typeRegistry,
      '.kibana-test',
      callAdminCluster,
      [],
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
      (migrator as unknown) as KibanaMigrator,
      typeRegistry,
      '.kibana-test',
      callAdminCluster,
      ['hiddenType', 'hiddenType', 'hiddenType'],
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
