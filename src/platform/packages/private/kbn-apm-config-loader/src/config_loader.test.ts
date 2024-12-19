/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
