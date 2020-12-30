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
  ApmConfigurationMock,
  applyConfigOverridesMock,
  getConfigFromFilesMock,
  getConfigurationFilePathsMock,
  resetAllMocks,
} from './config_loader.test.mocks';

import { loadConfiguration } from './config_loader';

describe('loadConfiguration', () => {
  const argv = ['some', 'arbitrary', 'args'];
  const rootDir = '/root/dir';
  const isDistributable = false;

  afterEach(() => {
    resetAllMocks();
  });

  it('calls `getConfigurationFilePaths` with the correct arguments', () => {
    loadConfiguration(argv, rootDir, isDistributable);
    expect(getConfigurationFilePathsMock).toHaveBeenCalledTimes(1);
    expect(getConfigurationFilePathsMock).toHaveBeenCalledWith(argv);
  });

  it('calls `getConfigFromFiles` with the correct arguments', () => {
    const configPaths = ['/path/to/config', '/path/to/other/config'];
    getConfigurationFilePathsMock.mockReturnValue(configPaths);

    loadConfiguration(argv, rootDir, isDistributable);
    expect(getConfigFromFilesMock).toHaveBeenCalledTimes(1);
    expect(getConfigFromFilesMock).toHaveBeenCalledWith(configPaths);
  });

  it('calls `applyConfigOverrides` with the correct arguments', () => {
    const config = { server: { uuid: 'uuid' } };
    getConfigFromFilesMock.mockReturnValue(config);

    loadConfiguration(argv, rootDir, isDistributable);
    expect(applyConfigOverridesMock).toHaveBeenCalledTimes(1);
    expect(applyConfigOverridesMock).toHaveBeenCalledWith(config, argv);
  });

  it('creates and return an `ApmConfiguration` instance', () => {
    const apmInstance = { apmInstance: true };
    ApmConfigurationMock.mockImplementation(() => apmInstance);

    const config = { server: { uuid: 'uuid' } };
    getConfigFromFilesMock.mockReturnValue(config);

    const instance = loadConfiguration(argv, rootDir, isDistributable);
    expect(ApmConfigurationMock).toHaveBeenCalledTimes(1);
    expect(ApmConfigurationMock).toHaveBeenCalledWith(rootDir, config, isDistributable);
    expect(instance).toBe(apmInstance);
  });
});
