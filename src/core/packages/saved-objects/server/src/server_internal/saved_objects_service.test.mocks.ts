/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockKibanaMigrator } from '../../mocks';
import { savedObjectsClientProviderMock, savedObjectsRepositoryMock } from '../../mocks';
import { typeRegistryMock } from '../../mocks';

export const migratorInstanceMock = mockKibanaMigrator.create();
export const KibanaMigratorMock = jest.fn().mockImplementation(() => migratorInstanceMock);
jest.doMock('../../migration_internal', () => {
  const actual = jest.requireActual('../../migration_internal');
  return {
    ...actual,
    KibanaMigrator: KibanaMigratorMock,
  };
});

export const clientProviderInstanceMock = savedObjectsClientProviderMock.create();
export const repositoryMock = savedObjectsRepositoryMock.create();

jest.doMock('../../api_internal', () => {
  const actual = jest.requireActual('../../api_internal');
  return {
    ...actual,
    SavedObjectsRepository: {
      createRepository: jest.fn().mockImplementation(() => repositoryMock),
    },
    SavedObjectsClientProvider: jest.fn().mockImplementation(() => clientProviderInstanceMock),
  };
});

export const typeRegistryInstanceMock = typeRegistryMock.create();
jest.doMock('../../base_internal', () => {
  const actual = jest.requireActual('../../base_internal');
  return {
    ...actual,
    SavedObjectTypeRegistry: jest.fn().mockImplementation(() => typeRegistryInstanceMock),
  };
});

export const registerRoutesMock = jest.fn();
jest.doMock('./routes', () => ({
  registerRoutes: registerRoutesMock,
}));
