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

export const getConfigurationFilePathsMock = jest.fn();
jest.doMock('./utils/get_config_file_paths', () => ({
  getConfigurationFilePaths: getConfigurationFilePathsMock,
}));

export const getConfigFromFilesMock = jest.fn();
jest.doMock('./utils/read_config', () => ({
  getConfigFromFiles: getConfigFromFilesMock,
}));

export const applyConfigOverridesMock = jest.fn();
jest.doMock('./utils/apply_config_overrides', () => ({
  applyConfigOverrides: applyConfigOverridesMock,
}));

export const ApmConfigurationMock = jest.fn();
jest.doMock('./config', () => ({
  ApmConfiguration: ApmConfigurationMock,
}));

export const resetAllMocks = () => {
  getConfigurationFilePathsMock.mockReset();
  getConfigFromFilesMock.mockReset();
  applyConfigOverridesMock.mockReset();
  ApmConfigurationMock.mockReset();
};
