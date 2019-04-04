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
import { InjectedMetadataService, InjectedMetadataStart } from './injected_metadata_service';

const createStartContractMock = () => {
  const startContract: jest.Mocked<InjectedMetadataStart> = {
    getBasePath: jest.fn(),
    getKibanaVersion: jest.fn(),
    getCspConfig: jest.fn(),
    getLegacyMetadata: jest.fn(),
    getInjectedVar: jest.fn(),
    getInjectedVars: jest.fn(),
  };
  startContract.getCspConfig.mockReturnValue({ warnLegacyBrowsers: true });
  startContract.getKibanaVersion.mockReturnValue('kibanaVersion');
  startContract.getLegacyMetadata.mockReturnValue({
    uiSettings: {
      defaults: { legacyInjectedUiSettingDefaults: true },
      user: { legacyInjectedUiSettingUserValues: true },
    },
  } as any);
  return startContract;
};

type InjectedMetadataServiceContract = PublicMethodsOf<InjectedMetadataService>;
const createMock = () => {
  const mocked: jest.Mocked<InjectedMetadataServiceContract> = {
    start: jest.fn(),
    getKibanaVersion: jest.fn(),
    getKibanaBuildNumber: jest.fn(),
  };
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const injectedMetadataServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
