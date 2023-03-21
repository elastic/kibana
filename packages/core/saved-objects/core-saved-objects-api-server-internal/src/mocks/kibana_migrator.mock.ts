/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';

// mock duplicated from `@kbn/core/saved-objects-migration-server-mocks` to avoid cyclic dependencies

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

const createMigratorMock = (
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

export const kibanaMigratorMock = {
  create: createMigratorMock,
};
