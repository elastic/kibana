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
import { InjectedMetadataService, InjectedMetadataSetup } from './injected_metadata_service';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<InjectedMetadataSetup> = {
    getBasePath: jest.fn(),
    getKibanaVersion: jest.fn(),
    getCspConfig: jest.fn(),
    getLegacyMetadata: jest.fn(),
    getPlugins: jest.fn(),
    getInjectedVar: jest.fn(),
    getInjectedVars: jest.fn(),
  };
  setupContract.getCspConfig.mockReturnValue({ warnLegacyBrowsers: true });
  setupContract.getKibanaVersion.mockReturnValue('kibanaVersion');
  setupContract.getLegacyMetadata.mockReturnValue({
    uiSettings: {
      defaults: { legacyInjectedUiSettingDefaults: true },
      user: { legacyInjectedUiSettingUserValues: true },
    },
  } as any);
  setupContract.getPlugins.mockReturnValue([]);
  return setupContract;
};

type InjectedMetadataServiceContract = PublicMethodsOf<InjectedMetadataService>;
const createMock = () => {
  const mocked: jest.Mocked<InjectedMetadataServiceContract> = {
    setup: jest.fn(),
    getKibanaVersion: jest.fn(),
    getKibanaBuildNumber: jest.fn(),
  };
  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const injectedMetadataServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
};
