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
  mockElasticsearchService,
  mockHttpService,
  mockLegacyService,
  mockPluginsService,
  mockConfigService,
  mockSavedObjectsService,
  mockContextService,
  mockEnsureValidConfiguration,
  mockUiSettingsService,
  mockRenderingService,
} from './server.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { Env } from './config';
import { Server } from './server';

import { getEnvOptions } from './config/__mocks__/env';
import { loggingServiceMock } from './logging/logging_service.mock';
import { rawConfigServiceMock } from './config/raw_config_service.mock';

const env = new Env('.', getEnvOptions());
const logger = loggingServiceMock.create();
const rawConfigService = rawConfigServiceMock.create({});

beforeEach(() => {
  mockConfigService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
  mockPluginsService.discover.mockResolvedValue(new Map());
});

afterEach(() => {
  jest.clearAllMocks();
});

test('sets up services on "setup"', async () => {
  const server = new Server(rawConfigService, env, logger);

  expect(mockHttpService.setup).not.toHaveBeenCalled();
  expect(mockElasticsearchService.setup).not.toHaveBeenCalled();
  expect(mockPluginsService.setup).not.toHaveBeenCalled();
  expect(mockLegacyService.setup).not.toHaveBeenCalled();
  expect(mockSavedObjectsService.setup).not.toHaveBeenCalled();
  expect(mockUiSettingsService.setup).not.toHaveBeenCalled();
  expect(mockRenderingService.setup).not.toHaveBeenCalled();

  await server.setup();

  expect(mockHttpService.setup).toHaveBeenCalledTimes(1);
  expect(mockElasticsearchService.setup).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.setup).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.setup).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.setup).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.setup).toHaveBeenCalledTimes(1);
  expect(mockRenderingService.setup).toHaveBeenCalledTimes(1);
});

test('injects legacy dependency to context#setup()', async () => {
  const server = new Server(rawConfigService, env, logger);

  const pluginA = Symbol();
  const pluginB = Symbol();
  const pluginDependencies = new Map<symbol, symbol[]>([
    [pluginA, []],
    [pluginB, [pluginA]],
  ]);
  mockPluginsService.discover.mockResolvedValue(pluginDependencies);

  await server.setup();

  expect(mockContextService.setup).toHaveBeenCalledWith({
    pluginDependencies: new Map([
      [pluginA, []],
      [pluginB, [pluginA]],
      [mockLegacyService.legacyId, [pluginA, pluginB]],
    ]),
  });
});

test('runs services on "start"', async () => {
  const server = new Server(rawConfigService, env, logger);

  expect(mockHttpService.setup).not.toHaveBeenCalled();
  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.setup();

  expect(mockHttpService.start).not.toHaveBeenCalled();
  expect(mockLegacyService.start).not.toHaveBeenCalled();
  expect(mockSavedObjectsService.start).not.toHaveBeenCalled();
  expect(mockUiSettingsService.start).not.toHaveBeenCalled();

  await server.start();

  expect(mockHttpService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.start).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.start).toHaveBeenCalledTimes(1);
});

test('does not fail on "setup" if there are unused paths detected', async () => {
  mockConfigService.getUnusedPaths.mockResolvedValue(['some.path', 'another.path']);

  const server = new Server(rawConfigService, env, logger);

  await expect(server.setup()).resolves.toBeDefined();
});

test('stops services on "stop"', async () => {
  const server = new Server(rawConfigService, env, logger);

  await server.setup();

  expect(mockHttpService.stop).not.toHaveBeenCalled();
  expect(mockElasticsearchService.stop).not.toHaveBeenCalled();
  expect(mockPluginsService.stop).not.toHaveBeenCalled();
  expect(mockLegacyService.stop).not.toHaveBeenCalled();
  expect(mockSavedObjectsService.stop).not.toHaveBeenCalled();
  expect(mockUiSettingsService.stop).not.toHaveBeenCalled();

  await server.stop();

  expect(mockHttpService.stop).toHaveBeenCalledTimes(1);
  expect(mockElasticsearchService.stop).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.stop).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.stop).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.stop).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.stop).toHaveBeenCalledTimes(1);
});

test(`doesn't setup core services if config validation fails`, async () => {
  mockConfigService.validate.mockImplementationOnce(() => {
    return Promise.reject(new Error('invalid config'));
  });
  const server = new Server(rawConfigService, env, logger);
  await expect(server.setup()).rejects.toThrowErrorMatchingInlineSnapshot(`"invalid config"`);

  expect(mockHttpService.setup).not.toHaveBeenCalled();
  expect(mockElasticsearchService.setup).not.toHaveBeenCalled();
  expect(mockPluginsService.setup).not.toHaveBeenCalled();
  expect(mockLegacyService.setup).not.toHaveBeenCalled();
  expect(mockUiSettingsService.setup).not.toHaveBeenCalled();
  expect(mockRenderingService.setup).not.toHaveBeenCalled();
});

test(`doesn't setup core services if legacy config validation fails`, async () => {
  mockEnsureValidConfiguration.mockImplementation(() => {
    throw new Error('Unknown configuration keys');
  });

  const server = new Server(rawConfigService, env, logger);

  await expect(server.setup()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Unknown configuration keys"`
  );

  expect(mockHttpService.setup).not.toHaveBeenCalled();
  expect(mockElasticsearchService.setup).not.toHaveBeenCalled();
  expect(mockPluginsService.setup).not.toHaveBeenCalled();
  expect(mockLegacyService.setup).not.toHaveBeenCalled();
  expect(mockSavedObjectsService.stop).not.toHaveBeenCalled();
  expect(mockUiSettingsService.setup).not.toHaveBeenCalled();
});
