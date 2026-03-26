/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { ServiceStatusLevels } from '@kbn/core-status-common';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import type {
  SavedObjectsService,
  InternalSavedObjectsServiceSetup,
  InternalSavedObjectsServiceStart,
} from '@kbn/core-saved-objects-server-internal';
import {
  savedObjectsRepositoryMock,
  savedObjectsClientMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { typeRegistryMock, serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import {
  savedObjectsExporterMock,
  savedObjectsImporterMock,
} from '@kbn/core-saved-objects-import-export-server-mocks';
import { migrationMocks } from '@kbn/core-saved-objects-migration-server-mocks';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { lazyObject } from '@kbn/lazy-object';

type SavedObjectsServiceContract = PublicMethodsOf<SavedObjectsService>;

const createStartContractMock = (typeRegistry?: jest.Mocked<ISavedObjectTypeRegistry>) => {
  const startContrat: jest.Mocked<SavedObjectsServiceStart> = lazyObject({
    getScopedClient: jest.fn().mockReturnValue(savedObjectsClientMock.create()),
    getUnsafeInternalClient: jest.fn().mockReturnValue(savedObjectsClientMock.create()),
    createInternalRepository: jest.fn().mockReturnValue(savedObjectsRepositoryMock.create()),
    createScopedRepository: jest.fn().mockReturnValue(savedObjectsRepositoryMock.create()),
    createSerializer: jest.fn(),
    createExporter: jest.fn().mockReturnValue(savedObjectsExporterMock.create()),
    createImporter: jest.fn().mockReturnValue(savedObjectsExporterMock.create()),
    getTypeRegistry: jest.fn().mockReturnValue(typeRegistry ?? typeRegistryMock.create()),
    getDefaultIndex: jest.fn().mockReturnValue(MAIN_SAVED_OBJECT_INDEX),
    getIndexForType: jest.fn().mockReturnValue(MAIN_SAVED_OBJECT_INDEX),
    getIndicesForTypes: jest.fn().mockReturnValue([MAIN_SAVED_OBJECT_INDEX]),
    getAllIndices: jest.fn().mockReturnValue([MAIN_SAVED_OBJECT_INDEX]),
  });

  return startContrat;
};

const createInternalStartContractMock = (typeRegistry?: jest.Mocked<ISavedObjectTypeRegistry>) => {
  const internalStartContract: jest.Mocked<InternalSavedObjectsServiceStart> = lazyObject({
    ...createStartContractMock(typeRegistry),
    metrics: {
      migrationDuration: 0,
    },
  });

  return internalStartContract;
};

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<SavedObjectsServiceSetup> = lazyObject({
    setClientFactoryProvider: jest.fn(),
    setEncryptionExtension: jest.fn(),
    setSecurityExtension: jest.fn(),
    setSpacesExtension: jest.fn(),
    setAccessControlTransforms: jest.fn(),
    registerType: jest.fn(),
    getDefaultIndex: jest.fn().mockReturnValue(MAIN_SAVED_OBJECT_INDEX),
    isAccessControlEnabled: jest.fn(),
  });

  return setupContract;
};

const createInternalSetupContractMock = () => {
  const internalSetupContract: jest.Mocked<InternalSavedObjectsServiceSetup> = lazyObject({
    ...createSetupContractMock(),
    status$: new BehaviorSubject({
      level: ServiceStatusLevels.available,
      summary: `SavedObjects is available`,
    }),
    getTypeRegistry: jest.fn(),
  });
  return internalSetupContract;
};

const createSavedObjectsServiceMock = () => {
  const mocked: jest.Mocked<SavedObjectsServiceContract> = lazyObject({
    setup: jest.fn().mockResolvedValue(createInternalSetupContractMock()),
    start: jest.fn().mockResolvedValue(createInternalStartContractMock()),
    stop: jest.fn().mockResolvedValue(void 0),
  });

  return mocked;
};

export const savedObjectsServiceMock = {
  create: createSavedObjectsServiceMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createSetupContract: createSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
  createStartContract: createStartContractMock,
  createMigrationContext: migrationMocks.createContext,
  createTypeRegistryMock: typeRegistryMock.create,
  createExporter: savedObjectsExporterMock.create,
  createImporter: savedObjectsImporterMock.create,
  createSerializer: serializerMock.create,
};
