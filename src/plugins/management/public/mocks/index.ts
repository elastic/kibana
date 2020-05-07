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

import { ManagementSetup, ManagementStart } from '../types';
import { ManagementSection } from '../management_section';

const createManagementSectionMock = (): jest.Mocked<PublicMethodsOf<ManagementSection>> => {
  return {
    registerApp: jest.fn(),
    getApp: jest.fn(),
    getAppsEnabled: jest.fn().mockReturnValue([]),
  };
};

const createSetupContract = (): DeeplyMockedKeys<ManagementSetup> => ({
  sections: {
    register: jest.fn(),
    getSection: jest.fn().mockReturnValue(createManagementSectionMock()),
    getAllSections: jest.fn().mockReturnValue([]),
  },
});

const createStartContract = (): DeeplyMockedKeys<ManagementStart> => ({
  legacy: {},
  sections: {
    getSection: jest.fn(),
    getAllSections: jest.fn(),
    navigateToApp: jest.fn(),
  },
});

export const managementPluginMock = {
  createSetupContract,
  createStartContract,
};
