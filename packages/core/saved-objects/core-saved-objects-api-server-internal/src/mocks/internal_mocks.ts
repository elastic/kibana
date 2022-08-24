/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SavedObjectsPointInTimeFinderClient,
  ISavedObjectsRepository,
} from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';

export const createPITClientMock = (): jest.Mocked<SavedObjectsPointInTimeFinderClient> => {
  return {
    find: jest.fn(),
    openPointInTimeForType: jest.fn(),
    closePointInTime: jest.fn(),
  };
};

export const createRepositoryMock = () => {
  const mock: jest.Mocked<ISavedObjectsRepository> = {
    checkConflicts: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
    delete: jest.fn(),
    bulkGet: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    closePointInTime: jest.fn(),
    createPointInTimeFinder: jest.fn(),
    openPointInTimeForType: jest.fn().mockResolvedValue({ id: 'some_pit_id' }),
    bulkResolve: jest.fn(),
    resolve: jest.fn(),
    update: jest.fn(),
    deleteByNamespace: jest.fn(),
    incrementCounter: jest.fn(),
    removeReferencesTo: jest.fn(),
    collectMultiNamespaceReferences: jest.fn(),
    updateObjectsSpaces: jest.fn(),
  };

  return mock;
};

const defaultSavedObjectTypes: SavedObjectsType[] = [
  {
    name: 'testtype',
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {
        name: { type: 'keyword' },
      },
    },
    migrations: () => ({}),
  },
];

export const createMigratorMock = (
  {
    types,
  }: {
    types: SavedObjectsType[];
  } = { types: defaultSavedObjectTypes }
) => {
  const mockMigrator: jest.Mocked<IKibanaMigrator> = {
    kibanaVersion: '8.0.0-testing',
    runMigrations: jest.fn(),
    getActiveMappings: jest.fn(),
    migrateDocument: jest.fn(),
    prepareMigrations: jest.fn(),
    getStatus$: jest.fn(),
  };

  // mockMigrator.getActiveMappings.mockReturnValue(buildActiveMappings(mergeTypes(types)));
  mockMigrator.migrateDocument.mockImplementation((doc) => doc);
  return mockMigrator;
};
