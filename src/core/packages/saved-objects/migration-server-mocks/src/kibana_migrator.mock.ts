/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type {
  IKibanaMigrator,
  KibanaMigratorStatus,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  buildActiveMappings,
  buildTypesMappings,
} from '@kbn/core-saved-objects-migration-server-internal';
import { createDocumentMigratorMock } from '@kbn/core-saved-objects-base-server-mocks';

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
    getDocumentMigrator: jest.fn(),
  };

  mockMigrator.getActiveMappings.mockReturnValue(buildActiveMappings(buildTypesMappings(types)));
  mockMigrator.migrateDocument.mockImplementation((doc) => doc);
  mockMigrator.getDocumentMigrator.mockReturnValue(createDocumentMigratorMock());

  return mockMigrator;
};

export const mockKibanaMigrator = {
  create: createMigrator,
};
