/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mocking the module to avoid waiting for a valid ES connection during these unit tests
import { securityServiceMock } from '@kbn/core-security-server-mocks';

jest.mock('./is_valid_connection', () => ({
  isValidConnection: jest.fn(),
}));

// Mocking this module to force different statuses to help with the unit tests
jest.mock('./version_check/ensure_es_version', () => ({
  pollEsNodesVersion: jest.fn(),
}));

import {
  MockClusterClient,
  isScriptingEnabledMock,
  getClusterInfoMock,
} from './elasticsearch_service.test.mocks';

import type { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { first, concatMap } from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';
import { Env } from '@kbn/config';
import { configServiceMock, getEnvOptions } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { configSchema, ElasticsearchConfig } from './elasticsearch_config';
import type { SetupDeps } from './elasticsearch_service';
import { ElasticsearchService } from './elasticsearch_service';
import { duration } from 'moment';
import { isValidConnection } from './is_valid_connection';
import { pollEsNodesVersion as pollEsNodesVersionMocked } from './version_check/ensure_es_version';

const { pollEsNodesVersion: pollEsNodesVersionActual } = jest.requireActual(
  './version_check/ensure_es_version'
);

const isValidConnectionMock = isValidConnection as jest.Mock;

const TICK = 10;
const tick = (ticks = 1) => jest.advanceTimersByTime(TICK * ticks);

const configService = configServiceMock.create();

let elasticsearchService: ElasticsearchService;
let env: Env;
let coreContext: CoreContext;
let mockClusterClientInstance: ReturnType<typeof elasticsearchClientMock.createCustomClusterClient>;
let mockConfig$: BehaviorSubject<any>;
let setupDeps: SetupDeps;
const nodesInfoResponse = {
  cluster_name: 'cluster-name',
  nodes: {},
};

beforeEach(() => {
  setupDeps = {
    analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
    http: httpServiceMock.createInternalSetupContract(),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
    security: securityServiceMock.createInternalSetup(),
  };

  env = Env.createDefault(REPO_ROOT, getEnvOptions());

  jest.useFakeTimers();

  mockConfig$ = new BehaviorSubject({
    hosts: ['http://1.2.3.4'],
    healthCheck: {
      delay: duration(TICK),
      startupDelay: duration(TICK),
      retry: 1,
    },
    ssl: {
      verificationMode: 'none',
    },
  });
  configService.atPath.mockReturnValue(mockConfig$);

  const logger = loggingSystemMock.create();
  coreContext = { coreId: Symbol(), env, logger, configService: configService as any };
  elasticsearchService = new ElasticsearchService(coreContext);

  mockClusterClientInstance = elasticsearchClientMock.createCustomClusterClient();
  MockClusterClient.mockImplementation(() => mockClusterClientInstance);

  isScriptingEnabledMock.mockResolvedValue(true);

  getClusterInfoMock.mockReturnValue(of({}));

  // @ts-expect-error TS does not get that `pollEsNodesVersion` is mocked
  pollEsNodesVersionMocked.mockImplementation(pollEsNodesVersionActual);
});

afterEach(async () => {
  jest.clearAllMocks();
  jest.useRealTimers();
  MockClusterClient.mockClear();
  isScriptingEnabledMock.mockReset();
  getClusterInfoMock.mockReset();
  await elasticsearchService?.stop();
});

describe('#preboot', () => {
  describe('#config', () => {
    it('exposes `hosts`', async () => {
      const prebootContract = await elasticsearchService.preboot();
      expect(prebootContract.config).toEqual({
        credentialsSpecified: false,
        hosts: ['http://1.2.3.4'],
      });
    });

    it('set `credentialsSpecified` to `true` if `username` is specified', async () => {
      mockConfig$.next(configSchema.validate({ username: 'kibana_system' }));
      const prebootContract = await elasticsearchService.preboot();
      expect(prebootContract.config.credentialsSpecified).toBe(true);
    });

    it('set `credentialsSpecified` to `true` if `password` is specified', async () => {
      mockConfig$.next(configSchema.validate({ password: 'changeme' }));
      const prebootContract = await elasticsearchService.preboot();
      expect(prebootContract.config.credentialsSpecified).toBe(true);
    });

    it('set `credentialsSpecified` to `true` if `serviceAccountToken` is specified', async () => {
      mockConfig$.next(configSchema.validate({ serviceAccountToken: 'xxxx' }));
      const prebootContract = await elasticsearchService.preboot();
      expect(prebootContract.config.credentialsSpecified).toBe(true);
    });
  });

  describe('#createClient', () => {
    it('allows to specify config properties', async () => {
      const prebootContract = await elasticsearchService.preboot();
      const customConfig = { keepAlive: true };
      const clusterClient = prebootContract.createClient('custom-type', customConfig);

      expect(clusterClient).toBe(mockClusterClientInstance);

      expect(MockClusterClient).toHaveBeenCalledTimes(1);
      expect(MockClusterClient.mock.calls[0][0]).toEqual(
        expect.objectContaining({ config: expect.objectContaining(customConfig) })
      );
    });

    it('creates a ClusterClient using the internal AgentManager as AgentFactoryProvider ', async () => {
      const prebootContract = await elasticsearchService.preboot();
      const customConfig = { keepAlive: true };
      const clusterClient = prebootContract.createClient('custom-type', customConfig);

      expect(clusterClient).toBe(mockClusterClientInstance);

      expect(MockClusterClient).toHaveBeenCalledTimes(1);
      expect(MockClusterClient.mock.calls[0][0]).toEqual(
        // eslint-disable-next-line dot-notation
        expect.objectContaining({ agentFactoryProvider: elasticsearchService['agentManager'] })
      );
    });

    it('creates a new client on each call', async () => {
      const prebootContract = await elasticsearchService.preboot();

      const customConfig = { keepAlive: true };

      prebootContract.createClient('custom-type', customConfig);
      prebootContract.createClient('another-type', customConfig);

      expect(MockClusterClient).toHaveBeenCalledTimes(2);
    });

    it('falls back to elasticsearch default config values if property not specified', async () => {
      const prebootContract = await elasticsearchService.preboot();

      const customConfig = {
        hosts: ['http://8.8.8.8'],
        logQueries: true,
        ssl: { certificate: 'certificate-value' },
      };

      prebootContract.createClient('some-custom-type', customConfig);
      const config = MockClusterClient.mock.calls[0][0].config;

      expect(config).toMatchInlineSnapshot(`
        Object {
          "healthCheckDelay": "PT0.01S",
          "healthCheckRetry": 1,
          "healthCheckStartupDelay": "PT0.01S",
          "hosts": Array [
            "http://8.8.8.8",
          ],
          "logQueries": true,
          "requestHeadersWhitelist": Array [
            undefined,
          ],
          "ssl": Object {
            "certificate": "certificate-value",
            "verificationMode": "none",
          },
        }
      `);
    });
  });
});

describe('#setup', () => {
  it('returns legacy Elasticsearch config as a part of the contract', async () => {
    const setupContract = await elasticsearchService.setup(setupDeps);

    await expect(setupContract.legacy.config$.pipe(first()).toPromise()).resolves.toBeInstanceOf(
      ElasticsearchConfig
    );
  });

  it('returns an AgentStatsProvider as part of the contract', async () => {
    const setupContract = await elasticsearchService.setup(setupDeps);
    expect(typeof setupContract.agentStatsProvider.getAgentsStats).toEqual('function');
  });

  it('esNodeVersionCompatibility$ only starts polling when subscribed to', async () => {
    const mockedClient = mockClusterClientInstance.asInternalUser;
    mockedClient.nodes.info.mockResolvedValue(nodesInfoResponse);

    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(0);

    const setupContract = await elasticsearchService.setup(setupDeps);

    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(1);

    tick();

    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(2);

    await firstValueFrom(setupContract.esNodesCompatibility$);
    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(2);
  });

  it('esNodeVersionCompatibility$ stops polling when unsubscribed from', async () => {
    const mockedClient = mockClusterClientInstance.asInternalUser;
    mockedClient.nodes.info.mockResolvedValue(nodesInfoResponse);

    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(0);

    const setupContract = await elasticsearchService.setup(setupDeps);

    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(1);

    await firstValueFrom(setupContract.esNodesCompatibility$);

    tick();

    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(2);
  });
});

describe('#start', () => {
  it('throws if called before `setup`', async () => {
    await expect(() => elasticsearchService.start()).rejects.toMatchInlineSnapshot(
      `[Error: ElasticsearchService needs to be setup before calling start]`
    );
  });

  it('returns elasticsearch client as a part of the contract', async () => {
    await elasticsearchService.setup(setupDeps);
    const startContract = await elasticsearchService.start();
    const client = startContract.client;

    expect(client.asInternalUser).toBe(mockClusterClientInstance.asInternalUser);
  });

  it('should log.error non-compatible nodes error', async () => {
    const defaultMessage = {
      isCompatible: true,
      kibanaVersion: '8.0.0',
      incompatibleNodes: [],
      warningNodes: [],
    };
    const observable$ = new BehaviorSubject<NodesVersionCompatibility>(defaultMessage);

    // @ts-expect-error this module is mocked, so `mockImplementation` is an allowed property
    pollEsNodesVersionMocked.mockImplementation(() => observable$);

    await elasticsearchService.setup(setupDeps);
    tick();
    await elasticsearchService.start();
    expect(loggingSystemMock.collect(coreContext.logger).error).toEqual([]);
    observable$.next({
      ...defaultMessage,
      isCompatible: false,
      message: 'Something went terribly wrong!',
    });
    expect(loggingSystemMock.collect(coreContext.logger).error).toEqual([
      ['Something went terribly wrong!'],
    ]);
  });

  it('logs an info message about connecting to ES', async () => {
    isValidConnectionMock.mockImplementation(async () => {
      tick();
    });

    await elasticsearchService.setup(setupDeps);
    await elasticsearchService.start();

    expect(isValidConnectionMock).toHaveBeenCalledTimes(1);

    const infoMessages = loggingSystemMock.collect(coreContext.logger).info;
    expect(infoMessages).toHaveLength(1);

    const esMessage = infoMessages[0][0];
    expect(esMessage).toMatch(
      /^Successfully connected to Elasticsearch after waiting for ([0-9]+) milliseconds$/
    );
  });

  it('returns the information about the time spent waiting for Elasticsearch', async () => {
    isValidConnectionMock.mockImplementation(async () => {
      tick();
    });

    await elasticsearchService.setup(setupDeps);
    const startContract = await elasticsearchService.start();

    expect(isValidConnectionMock).toHaveBeenCalledTimes(1);

    const infoMessages = loggingSystemMock.collect(coreContext.logger).info;
    expect(infoMessages).toHaveLength(1);

    const regexp =
      /^Successfully connected to Elasticsearch after waiting for ([0-9]+) milliseconds$/;

    const esMessage = infoMessages[0][0];
    const groups = regexp.exec(esMessage);
    const esWaitTime = parseInt(groups![1], 10);

    expect(startContract.metrics.elasticsearchWaitTime).toEqual(esWaitTime);
  });

  describe('skipStartupConnectionCheck', () => {
    it('should validate the connection by default', async () => {
      await elasticsearchService.setup(setupDeps);
      expect(isValidConnectionMock).not.toHaveBeenCalled();
      await elasticsearchService.start();
      expect(isValidConnectionMock).toHaveBeenCalledTimes(1);
    });

    it('should validate the connection when `false`', async () => {
      mockConfig$.next({
        ...(await mockConfig$.pipe(first()).toPromise()),
        skipStartupConnectionCheck: false,
      });
      await elasticsearchService.setup(setupDeps);
      expect(isValidConnectionMock).not.toHaveBeenCalled();
      await elasticsearchService.start();
      expect(isValidConnectionMock).toHaveBeenCalledTimes(1);
    });

    it('should not validate the connection when `true`', async () => {
      mockConfig$.next({
        ...(await mockConfig$.pipe(first()).toPromise()),
        skipStartupConnectionCheck: true,
      });
      await elasticsearchService.setup(setupDeps);
      expect(isValidConnectionMock).not.toHaveBeenCalled();
      await elasticsearchService.start();
      expect(isValidConnectionMock).not.toHaveBeenCalled();
    });
  });

  describe('isInlineScriptingEnabled', () => {
    it('does not throw error when scripting is enabled', async () => {
      isScriptingEnabledMock.mockResolvedValue(true);

      await elasticsearchService.setup(setupDeps);
      expect(isScriptingEnabledMock).not.toHaveBeenCalled();

      await expect(elasticsearchService.start()).resolves.toBeDefined();
      expect(isScriptingEnabledMock).toHaveBeenCalledTimes(1);
    });

    it('throws an error if scripting is disabled', async () => {
      isScriptingEnabledMock.mockResolvedValue(false);

      await elasticsearchService.setup(setupDeps);

      await expect(elasticsearchService.start()).rejects.toThrowError(
        'Inline scripting is disabled'
      );
    });

    it('does not throw error when `skipStartupConnectionCheck` is true', async () => {
      isScriptingEnabledMock.mockResolvedValue(false);
      mockConfig$.next({
        ...(await mockConfig$.pipe(first()).toPromise()),
        skipStartupConnectionCheck: true,
      });

      await elasticsearchService.setup(setupDeps);
      await expect(elasticsearchService.start()).resolves.toBeDefined();
    });
  });

  describe('#createClient', () => {
    it('allows to specify config properties', async () => {
      await elasticsearchService.setup(setupDeps);
      const startContract = await elasticsearchService.start();

      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      const customConfig = { keepAlive: true };
      const clusterClient = startContract.createClient('custom-type', customConfig);

      expect(clusterClient).toBe(mockClusterClientInstance);

      expect(MockClusterClient).toHaveBeenCalledTimes(1);
      expect(MockClusterClient.mock.calls[0][0]).toEqual(
        expect.objectContaining({ config: expect.objectContaining(customConfig) })
      );
    });
    it('creates a new client on each call', async () => {
      await elasticsearchService.setup(setupDeps);
      const startContract = await elasticsearchService.start();

      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      const customConfig = { keepAlive: true };

      startContract.createClient('custom-type', customConfig);
      startContract.createClient('another-type', customConfig);

      expect(MockClusterClient).toHaveBeenCalledTimes(2);
    });

    it('falls back to elasticsearch default config values if property not specified', async () => {
      await elasticsearchService.setup(setupDeps);
      const startContract = await elasticsearchService.start();

      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      const customConfig = {
        hosts: ['http://8.8.8.8'],
        logQueries: true,
        ssl: { certificate: 'certificate-value' },
      };

      startContract.createClient('some-custom-type', customConfig);
      const config = MockClusterClient.mock.calls[0][0].config;

      expect(config).toMatchInlineSnapshot(`
      Object {
        "healthCheckDelay": "PT0.01S",
        "healthCheckRetry": 1,
        "healthCheckStartupDelay": "PT0.01S",
        "hosts": Array [
          "http://8.8.8.8",
        ],
        "logQueries": true,
        "requestHeadersWhitelist": Array [
          undefined,
        ],
        "ssl": Object {
          "certificate": "certificate-value",
          "verificationMode": "none",
        },
      }
    `);
    });
  });
});

describe('#stop', () => {
  it('stops both legacy and new clients', async () => {
    await elasticsearchService.setup(setupDeps);
    await elasticsearchService.start();
    await elasticsearchService.stop();

    expect(mockClusterClientInstance.close).toHaveBeenCalledTimes(1);
  });

  it('stops pollEsNodeVersions even if there are active subscriptions', async () => {
    expect.assertions(3);

    const mockedClient = mockClusterClientInstance.asInternalUser;
    mockedClient.nodes.info.mockResolvedValue(nodesInfoResponse);

    const setupContract = await elasticsearchService.setup(setupDeps);

    await firstValueFrom(
      setupContract.esNodesCompatibility$.pipe(
        concatMap(async () => {
          expect(mockedClient.nodes.info).toHaveBeenCalledTimes(1);
          tick();
          expect(mockedClient.nodes.info).toHaveBeenCalledTimes(2);

          await elasticsearchService.stop();
          tick(10);
          expect(mockedClient.nodes.info).toHaveBeenCalledTimes(2);
        })
      )
    );
  });
});
