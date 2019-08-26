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

import { SavedObjectsService, SavedObjectsServiceStart } from './saved_objects_service';
import { mockKibanaMigrator } from './migrations/kibana/kibana_migrator.mock';

type SavedObjectsServiceContract = PublicMethodsOf<SavedObjectsService>;

const createStartContractMock = () => {
  const startContract: jest.Mocked<SavedObjectsServiceStart> = {
    migrator: mockKibanaMigrator.create(),
  };

  return startContract;
};

const createsavedObjectsServiceMock = () => {
  const mocked: jest.Mocked<SavedObjectsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockResolvedValue({});
  mocked.start.mockResolvedValue(createStartContractMock());
  mocked.stop.mockResolvedValue();
  return mocked;
};

export const savedObjectsServiceMock = {
  create: createsavedObjectsServiceMock,
  createStartContract: createStartContractMock,
};
