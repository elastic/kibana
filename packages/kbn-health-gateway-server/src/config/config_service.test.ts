/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  envCreateDefaultMock,
  configServiceMock,
  rawConfigServiceMock,
} from './config_service.test.mocks';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { fromRoot } from '@kbn/repo-info';
import { getConfigService } from './config_service';

const DEFAULT_CONFIG_PATH = fromRoot('config/gateway.yml');

describe('getConfigService', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  afterEach(() => {
    envCreateDefaultMock.mockClear();
    configServiceMock.mockClear();
    rawConfigServiceMock.mockClear();
  });

  test('instantiates RawConfigService with the default config path', () => {
    const oldArgv = process.argv;
    process.argv = [];

    getConfigService({ logger });
    expect(rawConfigServiceMock).toHaveBeenCalledTimes(1);
    expect(rawConfigServiceMock).toHaveBeenCalledWith([DEFAULT_CONFIG_PATH]);

    process.argv = oldArgv;
  });

  test('instantiates RawConfigService with a custom config path provided via -c flag', () => {
    const oldArgv = process.argv;
    process.argv = ['-a', 'bc', '-c', 'a/b/c.yml', '-x', 'yz'];

    getConfigService({ logger });

    expect(rawConfigServiceMock).toHaveBeenCalledTimes(1);
    expect(rawConfigServiceMock).toHaveBeenCalledWith(['a/b/c.yml']);

    process.argv = oldArgv;
  });

  test('instantiates RawConfigService with a custom config path provided via --config flag', () => {
    const oldArgv = process.argv;
    process.argv = ['-a', 'bc', '--config', 'a/b/c.yml', '-x', 'yz'];

    getConfigService({ logger });

    expect(rawConfigServiceMock).toHaveBeenCalledTimes(1);
    expect(rawConfigServiceMock).toHaveBeenCalledWith(['a/b/c.yml']);

    process.argv = oldArgv;
  });

  test('creates default env', async () => {
    const oldArgv = process.argv;
    process.argv = [];

    getConfigService({ logger });
    expect(envCreateDefaultMock).toHaveBeenCalledTimes(1);
    expect(envCreateDefaultMock.mock.calls[0][1].configs).toEqual([DEFAULT_CONFIG_PATH]);

    process.argv = oldArgv;
  });

  test('attempts to load the config', () => {
    const mockLoadConfig = jest.fn();
    rawConfigServiceMock.mockImplementationOnce(() => ({
      loadConfig: mockLoadConfig,
    }));
    getConfigService({ logger });
    expect(mockLoadConfig).toHaveBeenCalledTimes(1);
  });

  test('instantiates the config service', async () => {
    getConfigService({ logger });
    expect(configServiceMock).toHaveBeenCalledTimes(1);
  });
});
