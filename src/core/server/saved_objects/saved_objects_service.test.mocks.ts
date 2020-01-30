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

import { mockKibanaMigrator } from './migrations/kibana/kibana_migrator.mock';
import { savedObjectsClientProviderMock } from './service/lib/scoped_client_provider.mock';
import { typeRegistryMock } from './saved_objects_type_registry.mock';

export const migratorInstanceMock = mockKibanaMigrator.create();
export const KibanaMigratorMock = jest.fn().mockImplementation(() => migratorInstanceMock);
jest.doMock('./migrations/kibana/kibana_migrator', () => ({
  KibanaMigrator: KibanaMigratorMock,
}));

export const clientProviderInstanceMock = savedObjectsClientProviderMock.create();
jest.doMock('./service/lib/scoped_client_provider', () => ({
  SavedObjectsClientProvider: jest.fn().mockImplementation(() => clientProviderInstanceMock),
}));

export const typeRegistryInstanceMock = typeRegistryMock.create();
jest.doMock('./saved_objects_type_registry', () => ({
  SavedObjectTypeRegistry: jest.fn().mockImplementation(() => typeRegistryInstanceMock),
}));
