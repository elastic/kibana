/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

type SavedObjectsServiceContract = PublicMethodsOf<SavedObjectsService>;

const createStartContractMock = (typeRegistry?: jest.Mocked<ISavedObjectTypeRegistry>) => {
  const startContrat: jest.Mocked<SavedObjectsServiceStart> = {
    getScopedClient: jest.fn(),
    createInternalRepository: jest.fn(),
    createScopedRepository: jest.fn(),
    createSerializer: jest.fn(),
    createExporter: jest.fn(),
    createImporter: jest.fn(),
    getTypeRegistry: jest.fn(),
  };

  startContrat.getScopedClient.mockReturnValue(savedObjectsClientMock.create());
  startContrat.createInternalRepository.mockReturnValue(savedObjectsRepositoryMock.create());
  startContrat.createScopedRepository.mockReturnValue(savedObjectsRepositoryMock.create());
  startContrat.getTypeRegistry.mockReturnValue(typeRegistry ?? typeRegistryMock.create());
  startContrat.createExporter.mockReturnValue(savedObjectsExporterMock.create());
  startContrat.createImporter.mockReturnValue(savedObjectsImporterMock.create());

  return startContrat;
};

const createInternalStartContractMock = (typeRegistry?: jest.Mocked<ISavedObjectTypeRegistry>) => {
  const internalStartContract: jest.Mocked<InternalSavedObjectsServiceStart> =
    createStartContractMock(typeRegistry);

  return internalStartContract;
};

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<SavedObjectsServiceSetup> = {
    setClientFactoryProvider: jest.fn(),
    addClientWrapper: jest.fn(),
    registerType: jest.fn(),
    getKibanaIndex: jest.fn(),
  };

  setupContract.getKibanaIndex.mockReturnValue('.kibana');

  return setupContract;
};

const createInternalSetupContractMock = () => {
  const internalSetupContract: jest.Mocked<InternalSavedObjectsServiceSetup> = {
    ...createSetupContractMock(),
    status$: new BehaviorSubject({
      level: ServiceStatusLevels.available,
      summary: `SavedObjects is available`,
    }),
    getTypeRegistry: jest.fn(),
  };
  return internalSetupContract;
};

const createSavedObjectsServiceMock = () => {
  const mocked: jest.Mocked<SavedObjectsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockResolvedValue(createInternalSetupContractMock());
  mocked.start.mockResolvedValue(createInternalStartContractMock());
  mocked.stop.mockResolvedValue();
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
