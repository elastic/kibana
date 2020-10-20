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
  SavedObjectsManagementColumnService,
  SavedObjectsManagementColumnServiceSetup,
  SavedObjectsManagementColumnServiceStart,
} from './column_service';

const createSetupMock = (): jest.Mocked<SavedObjectsManagementColumnServiceSetup> => {
  const mock = {
    register: jest.fn(),
  };
  return mock;
};

const createStartMock = (): jest.Mocked<SavedObjectsManagementColumnServiceStart> => {
  const mock = {
    has: jest.fn(),
    getAll: jest.fn(),
  };

  mock.has.mockReturnValue(true);
  mock.getAll.mockReturnValue([]);

  return mock;
};

const createServiceMock = (): jest.Mocked<PublicMethodsOf<SavedObjectsManagementColumnService>> => {
  const mock = {
    setup: jest.fn().mockReturnValue(createSetupMock()),
    start: jest.fn().mockReturnValue(createStartMock()),
  };
  return mock;
};

export const columnServiceMock = {
  create: createServiceMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
};
