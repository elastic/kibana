/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IKibanaMigrator, KibanaMigratorStatus } from './kibana_migrator';
import { buildActiveMappings } from './core';

const { mergeTypes } = jest.requireActual('./kibana_migrator');
import { SavedObjectsType } from '../types';
import { BehaviorSubject } from 'rxjs';

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

const createMigrator = (
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
    getStatus$: jest.fn(
      () =>
        new BehaviorSubject<KibanaMigratorStatus>({
          status: 'completed',
          result: [
            {
              status: 'migrated',
              destIndex: '.test-kibana_2',
              sourceIndex: '.test-kibana_1',
              elapsedMs: 10,
            },
          ],
        })
    ),
  };

  mockMigrator.getActiveMappings.mockReturnValue(buildActiveMappings(mergeTypes(types)));
  mockMigrator.migrateDocument.mockImplementation((doc) => doc);
  return mockMigrator;
};

export const mockKibanaMigrator = {
  create: createMigrator,
};
