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

import {
  SavedObjectsService,
  InternalSavedObjectsServiceSetup,
  InternalSavedObjectsServiceStart,
} from './saved_objects_service';
import { mockKibanaMigrator } from './migrations/kibana/kibana_migrator.mock';
import { savedObjectsClientProviderMock } from './service/lib/scoped_client_provider.mock';
import { savedObjectsRepositoryMock } from './service/lib/repository.mock';
import { savedObjectsClientMock } from './service/saved_objects_client.mock';

type SavedObjectsServiceContract = PublicMethodsOf<SavedObjectsService>;

const createStartContractMock = () => {
  const startContract: jest.Mocked<InternalSavedObjectsServiceStart> = {
    clientProvider: savedObjectsClientProviderMock.create(),
    getScopedClient: jest.fn(),
    migrator: mockKibanaMigrator.create(),
  };

  return startContract;
};

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalSavedObjectsServiceSetup> = {
    getScopedClient: jest.fn(),
    setClientFactory: jest.fn(),
    addClientWrapper: jest.fn(),
    createInternalRepository: jest.fn(),
    createScopedRepository: jest.fn(),
  };

  setupContract.getScopedClient.mockReturnValue(savedObjectsClientMock.create());
  setupContract.createInternalRepository.mockReturnValue(savedObjectsRepositoryMock.create());
  setupContract.createScopedRepository.mockReturnValue(savedObjectsRepositoryMock.create());

  return setupContract;
};

const createsavedObjectsServiceMock = () => {
  const mocked: jest.Mocked<SavedObjectsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockResolvedValue(createSetupContractMock());
  mocked.start.mockResolvedValue(createStartContractMock());
  mocked.stop.mockResolvedValue();
  return mocked;
};

export const savedObjectsServiceMock = {
  create: createsavedObjectsServiceMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
