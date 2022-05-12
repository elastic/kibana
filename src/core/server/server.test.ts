/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockElasticsearchService,
  mockHttpService,
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
  mockEnvironmentService,
  mockPrebootService,
  mockDeprecationService,
  mockDocLinksService,
} from './server.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { REPO_ROOT } from '@kbn/utils';
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
    preboot: {
      pluginTree: { asOpaqueIds: new Map(), asNames: new Map() },
      pluginPaths: [],
      uiPlugins: { internal: new Map(), public: new Map(), browserConfigs: new Map() },
    },
    standard: {
      pluginTree: { asOpaqueIds: new Map(), asNames: new Map() },
      pluginPaths: [],
      uiPlugins: { internal: new Map(), public: new Map(), browserConfigs: new Map() },
    },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('preboot services on "preboot"', async () => {
  const server = new Server(rawConfigService, env, logger);

  expect(mockEnvironmentService.preboot).not.toHaveBeenCalled();
  expect(mockContextService.preboot).not.toHaveBeenCalled();
  expect(mockHttpService.preboot).not.toHaveBeenCalled();
  expect(mockI18nService.preboot).not.toHaveBeenCalled();
  expect(mockElasticsearchService.preboot).not.toHaveBeenCalled();
  expect(mockUiSettingsService.preboot).not.toHaveBeenCalled();
  expect(mockRenderingService.preboot).not.toHaveBeenCalled();
  expect(mockLoggingService.preboot).not.toHaveBeenCalled();
  expect(mockPluginsService.preboot).not.toHaveBeenCalled();
  expect(mockPrebootService.preboot).not.toHaveBeenCalled();

  await server.preboot();

  expect(mockEnvironmentService.preboot).toHaveBeenCalledTimes(1);
  expect(mockContextService.preboot).toHaveBeenCalledTimes(1);
  expect(mockHttpService.preboot).toHaveBeenCalledTimes(1);
  expect(mockI18nService.preboot).toHaveBeenCalledTimes(1);
  expect(mockElasticsearchService.preboot).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.preboot).toHaveBeenCalledTimes(1);
  expect(mockRenderingService.preboot).toHaveBeenCalledTimes(1);
  expect(mockLoggingService.preboot).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.preboot).toHaveBeenCalledTimes(1);
  expect(mockPrebootService.preboot).toHaveBeenCalledTimes(1);
});

test('sets up services on "setup"', async () => {
  const server = new Server(rawConfigService, env, logger);

  await server.preboot();

  expect(mockEnvironmentService.setup).not.toHaveBeenCalled();
  expect(mockHttpService.setup).not.toHaveBeenCalled();
  expect(mockElasticsearchService.setup).not.toHaveBeenCalled();
  expect(mockPluginsService.setup).not.toHaveBeenCalled();
  expect(mockSavedObjectsService.setup).not.toHaveBeenCalled();
  expect(mockUiSettingsService.setup).not.toHaveBeenCalled();
  expect(mockRenderingService.setup).not.toHaveBeenCalled();
  expect(mockMetricsService.setup).not.toHaveBeenCalled();
  expect(mockStatusService.setup).not.toHaveBeenCalled();
  expect(mockLoggingService.setup).not.toHaveBeenCalled();
  expect(mockI18nService.setup).not.toHaveBeenCalled();
  expect(mockDeprecationService.setup).not.toHaveBeenCalled();
  expect(mockDocLinksService.setup).not.toHaveBeenCalled();

  await server.setup();

  expect(mockEnvironmentService.setup).toHaveBeenCalled();
  expect(mockHttpService.setup).toHaveBeenCalledTimes(1);
  expect(mockElasticsearchService.setup).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.setup).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.setup).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.setup).toHaveBeenCalledTimes(1);
  expect(mockRenderingService.setup).toHaveBeenCalledTimes(1);
  expect(mockMetricsService.setup).toHaveBeenCalledTimes(1);
  expect(mockStatusService.setup).toHaveBeenCalledTimes(1);
  expect(mockLoggingService.setup).toHaveBeenCalledTimes(1);
  expect(mockI18nService.setup).toHaveBeenCalledTimes(1);
  expect(mockDeprecationService.setup).toHaveBeenCalledTimes(1);
  expect(mockDocLinksService.setup).toHaveBeenCalledTimes(1);
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
    preboot: {
      pluginTree: { asOpaqueIds: new Map(), asNames: new Map() },
      pluginPaths: [],
      uiPlugins: { internal: new Map(), public: new Map(), browserConfigs: new Map() },
    },
    standard: {
      pluginTree: { asOpaqueIds: pluginDependencies, asNames: new Map() },
      pluginPaths: [],
      uiPlugins: { internal: new Map(), public: new Map(), browserConfigs: new Map() },
    },
  });

  await server.preboot();
  await server.setup();

  expect(mockContextService.setup).toHaveBeenCalledWith({
    pluginDependencies: new Map([
      [pluginA, []],
      [pluginB, [pluginA]],
    ]),
  });
});

test('runs services on "start"', async () => {
  const server = new Server(rawConfigService, env, logger);

  await server.preboot();

  expect(mockHttpService.setup).not.toHaveBeenCalled();

  await server.setup();

  expect(mockHttpService.start).not.toHaveBeenCalled();
  expect(mockSavedObjectsService.start).not.toHaveBeenCalled();
  expect(mockUiSettingsService.start).not.toHaveBeenCalled();
  expect(mockMetricsService.start).not.toHaveBeenCalled();
  expect(mockStatusService.start).not.toHaveBeenCalled();
  expect(mockDeprecationService.start).not.toHaveBeenCalled();
  expect(mockDocLinksService.start).not.toHaveBeenCalled();

  await server.start();

  expect(mockHttpService.start).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.start).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.start).toHaveBeenCalledTimes(1);
  expect(mockMetricsService.start).toHaveBeenCalledTimes(1);
  expect(mockStatusService.start).toHaveBeenCalledTimes(1);
  expect(mockDeprecationService.start).toHaveBeenCalledTimes(1);
  expect(mockDocLinksService.start).toHaveBeenCalledTimes(1);
});

test('does not fail on "setup" if there are unused paths detected', async () => {
  mockConfigService.getUnusedPaths.mockResolvedValue(['some.path', 'another.path']);

  const server = new Server(rawConfigService, env, logger);

  await expect(server.preboot()).resolves.toBeDefined();
  await expect(server.setup()).resolves.toBeDefined();
});

test('stops services on "stop"', async () => {
  const server = new Server(rawConfigService, env, logger);

  await server.preboot();
  await server.setup();

  expect(mockHttpService.stop).not.toHaveBeenCalled();
  expect(mockElasticsearchService.stop).not.toHaveBeenCalled();
  expect(mockPluginsService.stop).not.toHaveBeenCalled();
  expect(mockSavedObjectsService.stop).not.toHaveBeenCalled();
  expect(mockUiSettingsService.stop).not.toHaveBeenCalled();
  expect(mockMetricsService.stop).not.toHaveBeenCalled();
  expect(mockStatusService.stop).not.toHaveBeenCalled();
  expect(mockLoggingService.stop).not.toHaveBeenCalled();

  await server.stop();

  expect(mockHttpService.stop).toHaveBeenCalledTimes(1);
  expect(mockElasticsearchService.stop).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.stop).toHaveBeenCalledTimes(1);
  expect(mockSavedObjectsService.stop).toHaveBeenCalledTimes(1);
  expect(mockUiSettingsService.stop).toHaveBeenCalledTimes(1);
  expect(mockMetricsService.stop).toHaveBeenCalledTimes(1);
  expect(mockStatusService.stop).toHaveBeenCalledTimes(1);
  expect(mockLoggingService.stop).toHaveBeenCalledTimes(1);
});

test(`doesn't preboot core services if config validation fails`, async () => {
  mockEnsureValidConfiguration.mockImplementation(() => {
    throw new Error('Unknown configuration keys');
  });

  const server = new Server(rawConfigService, env, logger);

  await expect(server.preboot()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Unknown configuration keys"`
  );

  expect(mockContextService.preboot).not.toHaveBeenCalled();
  expect(mockHttpService.preboot).not.toHaveBeenCalled();
  expect(mockI18nService.preboot).not.toHaveBeenCalled();
  expect(mockElasticsearchService.preboot).not.toHaveBeenCalled();
  expect(mockUiSettingsService.preboot).not.toHaveBeenCalled();
  expect(mockRenderingService.preboot).not.toHaveBeenCalled();
  expect(mockLoggingService.preboot).not.toHaveBeenCalled();
  expect(mockPluginsService.preboot).not.toHaveBeenCalled();
  expect(mockPrebootService.preboot).not.toHaveBeenCalled();
});
