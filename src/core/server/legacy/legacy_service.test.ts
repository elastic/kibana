/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('./cli_dev_mode');

import { BehaviorSubject, throwError } from 'rxjs';
import { REPO_ROOT } from '@kbn/dev-utils';

// @ts-expect-error js file to remove TS dependency on cli
import { CliDevMode as MockCliDevMode } from './cli_dev_mode';
import { Config, Env, ObjectToConfigAdapter } from '../config';
import { BasePathProxyServer } from '../http';
import { DiscoveredPlugin } from '../plugins';

import { getEnvOptions, configServiceMock } from '../config/mocks';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { contextServiceMock } from '../context/context_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { savedObjectsServiceMock } from '../saved_objects/saved_objects_service.mock';
import { capabilitiesServiceMock } from '../capabilities/capabilities_service.mock';
import { httpResourcesMock } from '../http_resources/http_resources_service.mock';
import { setupMock as renderingServiceMock } from '../rendering/__mocks__/rendering_service';
import { environmentServiceMock } from '../environment/environment_service.mock';
import { LegacyServiceSetupDeps } from './types';
import { LegacyService } from './legacy_service';
import { statusServiceMock } from '../status/status_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { metricsServiceMock } from '../metrics/metrics_service.mock';
import { i18nServiceMock } from '../i18n/i18n_service.mock';

let coreId: symbol;
let env: Env;
let config$: BehaviorSubject<Config>;

let setupDeps: LegacyServiceSetupDeps;

const logger = loggingSystemMock.create();
let configService: ReturnType<typeof configServiceMock.create>;
let environmentSetup: ReturnType<typeof environmentServiceMock.createSetupContract>;

beforeEach(() => {
  coreId = Symbol();
  env = Env.createDefault(REPO_ROOT, getEnvOptions());
  configService = configServiceMock.create();
  environmentSetup = environmentServiceMock.createSetupContract();

  setupDeps = {
    core: {
      capabilities: capabilitiesServiceMock.createSetupContract(),
      context: contextServiceMock.createSetupContract(),
      elasticsearch: { legacy: {} } as any,
      i18n: i18nServiceMock.createSetupContract(),
      uiSettings: uiSettingsServiceMock.createSetupContract(),
      http: {
        ...httpServiceMock.createInternalSetupContract(),
        auth: {
          getAuthHeaders: () => undefined,
        } as any,
      },
      httpResources: httpResourcesMock.createSetupContract(),
      savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      plugins: {
        initialized: true,
        contracts: new Map([['plugin-id', 'plugin-value']]),
      },
      rendering: renderingServiceMock,
      environment: environmentSetup,
      status: statusServiceMock.createInternalSetupContract(),
      logging: loggingServiceMock.createInternalSetupContract(),
      metrics: metricsServiceMock.createInternalSetupContract(),
    },
    plugins: { 'plugin-id': 'plugin-value' },
    uiPlugins: {
      public: new Map([['plugin-id', {} as DiscoveredPlugin]]),
      internal: new Map([
        [
          'plugin-id',
          {
            requiredBundles: [],
            publicTargetDir: 'path/to/target/public',
            publicAssetsDir: '/plugins/name/assets/',
          },
        ],
      ]),
      browserConfigs: new Map(),
    },
  };

  config$ = new BehaviorSubject<Config>(
    new ObjectToConfigAdapter({
      elasticsearch: { hosts: ['http://127.0.0.1'] },
      server: { autoListen: true },
    })
  );

  configService.getConfig$.mockReturnValue(config$);
  configService.getUsedPaths.mockResolvedValue(['foo.bar']);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('once LegacyService is set up with connection info', () => {
  test('throws if fails to retrieve initial config.', async () => {
    configService.getConfig$.mockReturnValue(throwError(new Error('something failed')));
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await expect(legacyService.setupLegacyConfig()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"something failed"`
    );
    await expect(legacyService.setup(setupDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Legacy config not initialized yet. Ensure LegacyService.setupLegacyConfig() is called before LegacyService.setup()"`
    );
    await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Legacy service is not setup yet."`
    );

    expect(MockKbnServer).not.toHaveBeenCalled();
    expect(MockCliDevMode).not.toHaveBeenCalled();
  });

  test('reconfigures logging configuration if new config is received.', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await legacyService.setupLegacyConfig();
    await legacyService.setup(setupDeps);
    await legacyService.start();

    const [mockKbnServer] = MockKbnServer.mock.instances as Array<jest.Mocked<KbnServer>>;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(mockKbnServer.applyLoggingConfiguration.mock.calls).toMatchSnapshot(
      `applyLoggingConfiguration params`
    );
  });

  test('logs error if re-configuring fails.', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await legacyService.setupLegacyConfig();
    await legacyService.setup(setupDeps);
    await legacyService.start();

    const [mockKbnServer] = MockKbnServer.mock.instances as Array<jest.Mocked<KbnServer>>;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(loggingSystemMock.collect(logger).error).toEqual([]);

    const configError = new Error('something went wrong');
    mockKbnServer.applyLoggingConfiguration.mockImplementation(() => {
      throw configError;
    });

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(loggingSystemMock.collect(logger).error).toEqual([[configError]]);
  });

  test('logs error if config service fails.', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(loggingSystemMock.collect(logger).error).toEqual([]);

    const configError = new Error('something went wrong');
    config$.error(configError);

    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(loggingSystemMock.collect(logger).error).toEqual([[configError]]);
  });
});

describe('once LegacyService is set up in `devClusterMaster` mode', () => {
  beforeEach(() => {
    configService.atPath.mockImplementation((path) => {
      return new BehaviorSubject(
        path === 'dev' ? { basePathProxyTargetPort: 100500 } : { basePath: '/abc' }
      );
    });
  });

  test('creates CliDevMode without base path proxy.', async () => {
    const devClusterLegacyService = new LegacyService({
      coreId,
      env: Env.createDefault(
        REPO_ROOT,
        getEnvOptions({
          cliArgs: { silent: true, basePath: false },
          isDevCliParent: true,
        })
      ),
      logger,
      configService: configService as any,
    });

    await devClusterLegacyService.setup(setupDeps);
    await devClusterLegacyService.start();

    expect(MockCliDevMode.fromCoreServices).toHaveBeenCalledTimes(1);
    expect(MockCliDevMode.fromCoreServices).toHaveBeenCalledWith(
      expect.objectContaining({ silent: true, basePath: false }),
      expect.objectContaining({
        get: expect.any(Function),
        set: expect.any(Function),
      }),
      undefined
    );
  });

  test('creates CliDevMode with base path proxy.', async () => {
    const devClusterLegacyService = new LegacyService({
      coreId,
      env: Env.createDefault(
        REPO_ROOT,
        getEnvOptions({
          cliArgs: { quiet: true, basePath: true },
          isDevCliParent: true,
        })
      ),
      logger,
      configService: configService as any,
    });

    await devClusterLegacyService.setup(setupDeps);
    await devClusterLegacyService.start();

    expect(MockCliDevMode.fromCoreServices).toHaveBeenCalledTimes(1);
    expect(MockCliDevMode.fromCoreServices).toHaveBeenCalledWith(
      expect.objectContaining({ quiet: true, basePath: true }),
      expect.objectContaining({
        get: expect.any(Function),
        set: expect.any(Function),
      }),
      expect.any(BasePathProxyServer)
    );
  });
});

describe('start', () => {
  test('Cannot start without setup phase', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await expect(legacyService.start()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Legacy service is not setup yet."`
    );
  });
});
