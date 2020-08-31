/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { BehaviorSubject } from 'rxjs';

import {
  SavedObjectsService,
  InternalSavedObjectsServiceSetup,
  InternalSavedObjectsServiceStart,
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from './saved_objects_service';
import { mockKibanaMigrator } from './migrations/kibana/kibana_migrator.mock';
import { savedObjectsClientProviderMock } from './service/lib/scoped_client_provider.mock';
import { savedObjectsRepositoryMock } from './service/lib/repository.mock';
import { savedObjectsClientMock } from './service/saved_objects_client.mock';
import { typeRegistryMock } from './saved_objects_type_registry.mock';
import { migrationMocks } from './migrations/mocks';
import { ServiceStatusLevels } from '../status';

type SavedObjectsServiceContract = PublicMethodsOf<SavedObjectsService>;

const createStartContractMock = () => {
  const startContrat: jest.Mocked<SavedObjectsServiceStart> = {
    getScopedClient: jest.fn(),
    createInternalRepository: jest.fn(),
    createScopedRepository: jest.fn(),
    createSerializer: jest.fn(),
    getTypeRegistry: jest.fn(),
  };

  startContrat.getScopedClient.mockReturnValue(savedObjectsClientMock.create());
  startContrat.createInternalRepository.mockReturnValue(savedObjectsRepositoryMock.create());
  startContrat.createScopedRepository.mockReturnValue(savedObjectsRepositoryMock.create());
  startContrat.getTypeRegistry.mockReturnValue(typeRegistryMock.create());

  return startContrat;
};

const createInternalStartContractMock = () => {
  const internalStartContract: jest.Mocked<InternalSavedObjectsServiceStart> = {
    ...createStartContractMock(),
    clientProvider: savedObjectsClientProviderMock.create(),
    migrator: mockKibanaMigrator.create(),
  };

  return internalStartContract;
};

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<SavedObjectsServiceSetup> = {
    setClientFactoryProvider: jest.fn(),
    addClientWrapper: jest.fn(),
    registerType: jest.fn(),
    getImportExportObjectLimit: jest.fn(),
  };

  setupContract.getImportExportObjectLimit.mockReturnValue(100);

  return setupContract;
};

const createInternalSetupContractMock = () => {
  const internalSetupContract: jest.Mocked<InternalSavedObjectsServiceSetup> = {
    ...createSetupContractMock(),
    status$: new BehaviorSubject({
      level: ServiceStatusLevels.available,
      summary: `SavedObjects is available`,
    }),
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
};
