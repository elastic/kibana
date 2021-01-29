/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  mockMetricsService,
  mockStatusService,
  mockLoggingService,
  mockI18nService,
} from './server.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { REPO_ROOT } from '@kbn/dev-utils';
import { rawConfigServiceMock, getEnvOptions } from './config/mocks';
import { Env } from './config';
import { Server } from './server';

import { loggingSystemMock } from './logging/logging_system.mock';

const env = Env.createDefault(REPO_ROOT, getEnvOptions());
const logger = loggingSystemMock.create();
const rawConfigService = rawConfigServiceMock.create({});

beforeEach(() => {
  mockConfigService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
  mockPluginsService.discover.mockResolvedValue({
    pluginTree: { asOpaqueIds: new Map(), asNames: new Map() },
    pluginPaths: [],
    uiPlugins: { internal: new Map(), public: new Map(), browserConfigs: new Map() },
  });
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
  expect(mockMetricsService.setup).not.toHaveBeenCalled();
  expect(mockStatusService.setup).not.toHaveBeenCalled();
  expect(mockLoggingService.setup).not.toHaveBeenCalled();
  expect(mockI18nService.setup).not.toHaveBeenCalled();

  await server.setup();

  expect(mockHttpService.setup).toHaveBeenCalledTimes(1);
  expect(mockElasticsearchService.setup).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.setup).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.setup).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.setup).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.setup).toHaveBeenCalledTimes(1);
  expect(mockRenderingService.setup).toHaveBeenCalledTimes(1);
  expect(mockMetricsService.setup).toHaveBeenCalledTimes(1);
  expect(mockStatusService.setup).toHaveBeenCalledTimes(1);
  expect(mockLoggingService.setup).toHaveBeenCalledTimes(1);
  expect(mockI18nService.setup).toHaveBeenCalledTimes(1);
});

test('injects legacy dependency to context#setup()', async () => {
  const server = new Server(rawConfigService, env, logger);

  const pluginA = Symbol();
  const pluginB = Symbol();
  const pluginDependencies = new Map<symbol, symbol[]>([
    [pluginA, []],
    [pluginB, [pluginA]],
  ]);
  mockPluginsService.discover.mockResolvedValue({
    pluginTree: { asOpaqueIds: pluginDependencies, asNames: new Map() },
    pluginPaths: [],
    uiPlugins: { internal: new Map(), public: new Map(), browserConfigs: new Map() },
  });

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
  expect(mockMetricsService.start).not.toHaveBeenCalled();

  await server.start();

  expect(mockHttpService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.start).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.start).toHaveBeenCalledTimes(1);
  expect(mockMetricsService.start).toHaveBeenCalledTimes(1);
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
  expect(mockMetricsService.stop).not.toHaveBeenCalled();
  expect(mockStatusService.stop).not.toHaveBeenCalled();
  expect(mockLoggingService.stop).not.toHaveBeenCalled();

  await server.stop();

  expect(mockHttpService.stop).toHaveBeenCalledTimes(1);
  expect(mockElasticsearchService.stop).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.stop).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.stop).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.stop).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.stop).toHaveBeenCalledTimes(1);
  expect(mockMetricsService.stop).toHaveBeenCalledTimes(1);
  expect(mockStatusService.stop).toHaveBeenCalledTimes(1);
  expect(mockLoggingService.stop).toHaveBeenCalledTimes(1);
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
  expect(mockSavedObjectsService.stop).not.toHaveBeenCalled();
  expect(mockUiSettingsService.setup).not.toHaveBeenCalled();
  expect(mockRenderingService.setup).not.toHaveBeenCalled();
  expect(mockMetricsService.setup).not.toHaveBeenCalled();
  expect(mockStatusService.setup).not.toHaveBeenCalled();
  expect(mockLoggingService.setup).not.toHaveBeenCalled();
  expect(mockI18nService.setup).not.toHaveBeenCalled();
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
  expect(mockMetricsService.setup).not.toHaveBeenCalled();
  expect(mockStatusService.setup).not.toHaveBeenCalled();
  expect(mockLoggingService.setup).not.toHaveBeenCalled();
  expect(mockI18nService.setup).not.toHaveBeenCalled();
});

test(`doesn't validate config if env.isDevCliParent is true`, async () => {
  const devParentEnv = Env.createDefault(REPO_ROOT, {
    ...getEnvOptions(),
    isDevCliParent: true,
  });

  const server = new Server(rawConfigService, devParentEnv, logger);
  await server.setup();

  expect(mockEnsureValidConfiguration).not.toHaveBeenCalled();
  expect(mockContextService.setup).toHaveBeenCalled();
  expect(mockHttpService.setup).toHaveBeenCalled();
  expect(mockElasticsearchService.setup).toHaveBeenCalled();
  expect(mockSavedObjectsService.setup).toHaveBeenCalled();
});
