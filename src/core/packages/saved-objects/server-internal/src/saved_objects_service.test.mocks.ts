/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { mockKibanaMigrator } from '@kbn/core-saved-objects-migration-server-mocks';
import {
  savedObjectsClientProviderMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';

export const migratorInstanceMock = mockKibanaMigrator.create();
export const KibanaMigratorMock = vi.fn().mockImplementation(() => migratorInstanceMock);
vi.doMock('@kbn/core-saved-objects-migration-server-internal', async () => {
  const actual = (await vi.importActual('@kbn/core-saved-objects-migration-server-internal'));
  return {
    ...actual,
    KibanaMigrator: KibanaMigratorMock,
  };
});

export const clientProviderInstanceMock = savedObjectsClientProviderMock.create();
export const repositoryMock = savedObjectsRepositoryMock.create();

vi.doMock('@kbn/core-saved-objects-api-server-internal', async () => {
  const actual = (await vi.importActual('@kbn/core-saved-objects-api-server-internal'));
  return {
    ...actual,
    SavedObjectsRepository: {
      createRepository: vi.fn().mockImplementation(() => repositoryMock),
    },
    SavedObjectsClientProvider: vi.fn().mockImplementation(() => clientProviderInstanceMock),
  };
});

export const typeRegistryInstanceMock = typeRegistryMock.create();
vi.doMock('@kbn/core-saved-objects-base-server-internal', async () => {
  const actual = (await vi.importActual('@kbn/core-saved-objects-base-server-internal'));
  return {
    ...actual,
    SavedObjectTypeRegistry: vi.fn().mockImplementation(() => typeRegistryInstanceMock),
  };
});

export const registerRoutesMock = vi.fn();
vi.doMock('./routes', () => {
      const mocked = {
      registerRoutes: registerRoutesMock,
    };
      return { ...mocked, default: mocked };
    });
