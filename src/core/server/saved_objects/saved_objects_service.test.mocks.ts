/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockKibanaMigrator } from './migrations/kibana_migrator.mock';
import { savedObjectsClientProviderMock } from './service/lib/scoped_client_provider.mock';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';

export const migratorInstanceMock = mockKibanaMigrator.create();
export const KibanaMigratorMock = jest.fn().mockImplementation(() => migratorInstanceMock);
jest.doMock('./migrations/kibana_migrator', () => ({
  KibanaMigrator: KibanaMigratorMock,
}));

export const clientProviderInstanceMock = savedObjectsClientProviderMock.create();
jest.doMock('./service/lib/scoped_client_provider', () => ({
  SavedObjectsClientProvider: jest.fn().mockImplementation(() => clientProviderInstanceMock),
}));

export const typeRegistryInstanceMock = typeRegistryMock.create();
jest.doMock('@kbn/core-saved-objects-base-server-internal', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-base-server-internal');
  return {
    ...actual,
    SavedObjectTypeRegistry: jest.fn().mockImplementation(() => typeRegistryInstanceMock),
  };
});

export const registerRoutesMock = jest.fn();
jest.doMock('./routes', () => ({
  registerRoutes: registerRoutesMock,
}));
