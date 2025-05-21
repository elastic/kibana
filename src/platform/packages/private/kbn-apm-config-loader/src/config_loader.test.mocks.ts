/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
