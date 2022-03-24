/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ConfigPath } from '@kbn/config';
import { BehaviorSubject, Observable } from 'rxjs';
import { HotObservable } from 'rxjs/internal/testing/HotObservable';
import { TestScheduler } from 'rxjs/testing';

import { configServiceMock } from '../config/mocks';

import { mockCoreContext } from '../core_context.mock';
import { config as RawElasticsearchConfig } from '../elasticsearch/elasticsearch_config';
import { config as RawHttpConfig } from '../http/http_config';
import { config as RawLoggingConfig } from '../logging/logging_config';
import { savedObjectsConfig as RawSavedObjectsConfig } from '../saved_objects/saved_objects_config';
import { httpServiceMock } from '../http/http_service.mock';
import { metricsServiceMock } from '../metrics/metrics_service.mock';
import { savedObjectsServiceMock } from '../saved_objects/saved_objects_service.mock';

import { CoreUsageDataService } from './core_usage_data_service';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';
import { typeRegistryMock } from '../saved_objects/saved_objects_type_registry.mock';
import { CORE_USAGE_STATS_TYPE } from './constants';
import { CoreUsageStatsClient } from './core_usage_stats_client';

describe('CoreUsageDataService', () => {
  function getConfigServiceAtPathMockImplementation() {
    return (path: ConfigPath) => {
      if (path === 'elasticsearch') {
        return new BehaviorSubject(RawElasticsearchConfig.schema.validate({}));
      } else if (path === 'server') {
        return new BehaviorSubject(RawHttpConfig.schema.validate({}));
      } else if (path === 'logging') {
        return new BehaviorSubject(RawLoggingConfig.schema.validate({}));
      } else if (path === 'savedObjects') {
        return new BehaviorSubject(RawSavedObjectsConfig.schema.validate({}));
      }
      return new BehaviorSubject({});
    };
  }

  const getTestScheduler = () =>
    new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

  let service: CoreUsageDataService;
  let configService: ReturnType<typeof configServiceMock.create>;

  const mockConfig = {
    unused_config: {},
    elasticsearch: { username: 'kibana_system', password: 'changeme' },
    plugins: { paths: ['pluginA', 'pluginAB', 'pluginB'] },
    server: { port: 5603, basePath: '/zvt', rewriteBasePath: true },
    logging: { json: false },
    pluginA: {
      enabled: true,
      objectConfig: {
        debug: true,
        username: 'some_user',
      },
      arrayOfNumbers: [1, 2, 3],
    },
    pluginAB: {
      enabled: false,
    },
    pluginB: {
      arrayOfObjects: [
        { propA: 'a', propB: 'b' },
        { propA: 'a2', propB: 'b2' },
      ],
    },
  };

  beforeEach(() => {
    configService = configServiceMock.create({ getConfig$: mockConfig });
    configService.atPath.mockImplementation(getConfigServiceAtPathMockImplementation());

    const coreContext = mockCoreContext.create({ configService });
    service = new CoreUsageDataService(coreContext);
  });

  describe('setup', () => {
    it('creates internal repository', async () => {
      const http = httpServiceMock.createInternalSetupContract();
      const metrics = metricsServiceMock.createInternalSetupContract();
      const savedObjectsStartPromise = Promise.resolve(
        savedObjectsServiceMock.createStartContract()
      );
      const changedDeprecatedConfigPath$ = configServiceMock.create().getDeprecatedConfigPath$();
      service.setup({ http, metrics, savedObjectsStartPromise, changedDeprecatedConfigPath$ });

      const savedObjects = await savedObjectsStartPromise;
      expect(savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
      expect(savedObjects.createInternalRepository).toHaveBeenCalledWith([CORE_USAGE_STATS_TYPE]);
    });

    describe('#registerType', () => {
      it('registers core usage stats type', async () => {
        const http = httpServiceMock.createInternalSetupContract();
        const metrics = metricsServiceMock.createInternalSetupContract();
        const savedObjectsStartPromise = Promise.resolve(
          savedObjectsServiceMock.createStartContract()
        );
        const changedDeprecatedConfigPath$ = configServiceMock.create().getDeprecatedConfigPath$();
        const coreUsageData = service.setup({
          http,
          metrics,
          savedObjectsStartPromise,
          changedDeprecatedConfigPath$,
        });
        const typeRegistry = typeRegistryMock.create();

        coreUsageData.registerType(typeRegistry);
        expect(typeRegistry.registerType).toHaveBeenCalledTimes(1);
        expect(typeRegistry.registerType).toHaveBeenCalledWith({
          name: CORE_USAGE_STATS_TYPE,
          hidden: true,
          namespaceType: 'agnostic',
          mappings: expect.anything(),
          migrations: expect.anything(),
        });
      });
    });

    describe('#getClient', () => {
      it('returns client', async () => {
        const http = httpServiceMock.createInternalSetupContract();
        const metrics = metricsServiceMock.createInternalSetupContract();
        const savedObjectsStartPromise = Promise.resolve(
          savedObjectsServiceMock.createStartContract()
        );
        const changedDeprecatedConfigPath$ = configServiceMock.create().getDeprecatedConfigPath$();
        const coreUsageData = service.setup({
          http,
          metrics,
          savedObjectsStartPromise,
          changedDeprecatedConfigPath$,
        });

        const usageStatsClient = coreUsageData.getClient();
        expect(usageStatsClient).toBeInstanceOf(CoreUsageStatsClient);
      });
    });

    describe('Usage Counter', () => {
      it('registers a usage counter and uses it to increment the counters', async () => {
        const http = httpServiceMock.createInternalSetupContract();
        const metrics = metricsServiceMock.createInternalSetupContract();
        const savedObjectsStartPromise = Promise.resolve(
          savedObjectsServiceMock.createStartContract()
        );
        const changedDeprecatedConfigPath$ = configServiceMock.create().getDeprecatedConfigPath$();
        const coreUsageData = service.setup({
          http,
          metrics,
          savedObjectsStartPromise,
          changedDeprecatedConfigPath$,
        });
        const myUsageCounter = { incrementCounter: jest.fn() };
        coreUsageData.registerUsageCounter(myUsageCounter);
        coreUsageData.incrementUsageCounter({ counterName: 'test' });
        expect(myUsageCounter.incrementCounter).toHaveBeenCalledWith({ counterName: 'test' });
      });

      it('swallows errors when provided increment counter fails', async () => {
        const http = httpServiceMock.createInternalSetupContract();
        const metrics = metricsServiceMock.createInternalSetupContract();
        const savedObjectsStartPromise = Promise.resolve(
          savedObjectsServiceMock.createStartContract()
        );
        const changedDeprecatedConfigPath$ = configServiceMock.create().getDeprecatedConfigPath$();
        const coreUsageData = service.setup({
          http,
          metrics,
          savedObjectsStartPromise,
          changedDeprecatedConfigPath$,
        });
        const myUsageCounter = {
          incrementCounter: jest.fn(() => {
            throw new Error('Something is really wrong');
          }),
        };
        coreUsageData.registerUsageCounter(myUsageCounter);
        expect(() => coreUsageData.incrementUsageCounter({ counterName: 'test' })).not.toThrow();
        expect(myUsageCounter.incrementCounter).toHaveBeenCalledWith({ counterName: 'test' });
      });
    });
  });

  describe('start', () => {
    describe('getCoreUsageData', () => {
      function setup() {
        const http = httpServiceMock.createInternalSetupContract();
        const metrics = metricsServiceMock.createInternalSetupContract();
        const savedObjectsStartPromise = Promise.resolve(
          savedObjectsServiceMock.createStartContract()
        );
        const changedDeprecatedConfigPath$ = new BehaviorSubject({
          set: ['new.path'],
          unset: ['deprecated.path'],
        });
        service.setup({ http, metrics, savedObjectsStartPromise, changedDeprecatedConfigPath$ });
        const elasticsearch = elasticsearchServiceMock.createStart();
        elasticsearch.client.asInternalUser.cat.indices.mockResponseOnce([
          {
            name: '.kibana_task_manager_1',
            'docs.count': '10',
            'docs.deleted': '10',
            'store.size': '1000',
            'pri.store.size': '2000',
          },
        ] as any);
        elasticsearch.client.asInternalUser.count.mockResponseOnce({
          count: '15',
        } as any);
        elasticsearch.client.asInternalUser.cat.indices.mockResponseOnce([
          {
            name: '.kibana_1',
            'docs.count': '20',
            'docs.deleted': '20',
            'store.size': '2000',
            'pri.store.size': '4000',
          },
        ] as any);
        elasticsearch.client.asInternalUser.count.mockResponseOnce({
          count: '10',
        } as any);
        elasticsearch.client.asInternalUser.search.mockResponseOnce({
          hits: { total: { value: 6 } },
          aggregations: {
            aliases: {
              buckets: {
                active: { doc_count: 1 },
                disabled: { doc_count: 2 },
              },
            },
          },
        } as any);
        const typeRegistry = savedObjectsServiceMock.createTypeRegistryMock();
        typeRegistry.getAllTypes.mockReturnValue([
          { name: 'type 1', indexPattern: '.kibana' },
          { name: 'type 2', indexPattern: '.kibana_task_manager' },
        ] as any);

        const { getCoreUsageData } = service.start({
          savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
          exposedConfigsToUsage: new Map(),
          elasticsearch,
        });
        return { getCoreUsageData };
      }

      it('returns core metrics for default config', async () => {
        const { getCoreUsageData } = setup();
        expect(getCoreUsageData()).resolves.toMatchInlineSnapshot(`
          Object {
            "config": Object {
              "deprecatedKeys": Object {
                "set": Array [
                  "new.path",
                ],
                "unset": Array [
                  "deprecated.path",
                ],
              },
              "elasticsearch": Object {
                "apiVersion": "master",
                "customHeadersConfigured": false,
                "healthCheckDelayMs": 2500,
                "logQueries": false,
                "numberOfHostsConfigured": 1,
                "pingTimeoutMs": 30000,
                "principal": "unknown",
                "requestHeadersWhitelistConfigured": false,
                "requestTimeoutMs": 30000,
                "shardTimeoutMs": 30000,
                "sniffIntervalMs": -1,
                "sniffOnConnectionFault": false,
                "sniffOnStart": false,
                "ssl": Object {
                  "alwaysPresentCertificate": false,
                  "certificateAuthoritiesConfigured": false,
                  "certificateConfigured": false,
                  "keyConfigured": false,
                  "keystoreConfigured": false,
                  "truststoreConfigured": false,
                  "verificationMode": "full",
                },
              },
              "http": Object {
                "basePathConfigured": false,
                "compression": Object {
                  "enabled": true,
                  "referrerWhitelistConfigured": false,
                },
                "keepaliveTimeout": 120000,
                "maxPayloadInBytes": 1048576,
                "requestId": Object {
                  "allowFromAnyIp": false,
                  "ipAllowlistConfigured": false,
                },
                "rewriteBasePath": false,
                "securityResponseHeaders": Object {
                  "disableEmbedding": false,
                  "permissionsPolicyConfigured": false,
                  "referrerPolicy": "no-referrer-when-downgrade",
                  "strictTransportSecurity": "NULL",
                  "xContentTypeOptions": "nosniff",
                },
                "socketTimeout": 120000,
                "ssl": Object {
                  "certificateAuthoritiesConfigured": false,
                  "certificateConfigured": false,
                  "cipherSuites": Array [
                    "TLS_AES_256_GCM_SHA384",
                    "TLS_CHACHA20_POLY1305_SHA256",
                    "TLS_AES_128_GCM_SHA256",
                    "ECDHE-RSA-AES128-GCM-SHA256",
                    "ECDHE-ECDSA-AES128-GCM-SHA256",
                    "ECDHE-RSA-AES256-GCM-SHA384",
                    "ECDHE-ECDSA-AES256-GCM-SHA384",
                    "DHE-RSA-AES128-GCM-SHA256",
                    "ECDHE-RSA-AES128-SHA256",
                    "DHE-RSA-AES128-SHA256",
                    "ECDHE-RSA-AES256-SHA384",
                    "DHE-RSA-AES256-SHA384",
                    "ECDHE-RSA-AES256-SHA256",
                    "DHE-RSA-AES256-SHA256",
                    "HIGH",
                    "!aNULL",
                    "!eNULL",
                    "!EXPORT",
                    "!DES",
                    "!RC4",
                    "!MD5",
                    "!PSK",
                    "!SRP",
                    "!CAMELLIA",
                  ],
                  "clientAuthentication": "none",
                  "keyConfigured": false,
                  "keystoreConfigured": false,
                  "redirectHttpFromPortConfigured": false,
                  "supportedProtocols": Array [
                    "TLSv1.1",
                    "TLSv1.2",
                    "TLSv1.3",
                  ],
                  "truststoreConfigured": false,
                },
                "xsrf": Object {
                  "allowlistConfigured": false,
                  "disableProtection": false,
                },
              },
              "logging": Object {
                "appendersTypesUsed": Array [],
                "loggersConfiguredCount": 0,
              },
              "savedObjects": Object {
                "customIndex": false,
                "maxImportExportSize": 10000,
                "maxImportPayloadBytes": 26214400,
              },
            },
            "environment": Object {
              "memory": Object {
                "heapSizeLimit": 1,
                "heapTotalBytes": 1,
                "heapUsedBytes": 1,
              },
            },
            "services": Object {
              "savedObjects": Object {
                "indices": Array [
                  Object {
                    "alias": ".kibana",
                    "docsCount": 10,
                    "docsDeleted": 10,
                    "primaryStoreSizeBytes": 2000,
                    "savedObjectsDocsCount": "15",
                    "storeSizeBytes": 1000,
                  },
                  Object {
                    "alias": ".kibana_task_manager",
                    "docsCount": 20,
                    "docsDeleted": 20,
                    "primaryStoreSizeBytes": 4000,
                    "savedObjectsDocsCount": "10",
                    "storeSizeBytes": 2000,
                  },
                ],
                "legacyUrlAliases": Object {
                  "activeCount": 1,
                  "disabledCount": 2,
                  "inactiveCount": 3,
                  "totalCount": 6,
                },
              },
            },
          }
        `);
      });

      describe('elasticsearch.principal', () => {
        async function doTest({
          username,
          serviceAccountToken,
          expectedPrincipal,
        }: {
          username?: string;
          serviceAccountToken?: string;
          expectedPrincipal: string;
        }) {
          const defaultMockImplementation = getConfigServiceAtPathMockImplementation();
          configService.atPath.mockImplementation((path) => {
            if (path === 'elasticsearch') {
              return new BehaviorSubject(
                RawElasticsearchConfig.schema.validate({ username, serviceAccountToken })
              );
            }
            return defaultMockImplementation(path);
          });
          const { getCoreUsageData } = setup();
          return expect(getCoreUsageData()).resolves.toEqual(
            expect.objectContaining({
              config: expect.objectContaining({
                elasticsearch: expect.objectContaining({ principal: expectedPrincipal }),
              }),
            })
          );
        }

        it('returns expected usage data for elastic.username "kibana"', async () => {
          return doTest({ username: 'kibana', expectedPrincipal: 'kibana_user' });
        });

        it('returns expected usage data for elastic.username "kibana_system"', async () => {
          return doTest({ username: 'kibana_system', expectedPrincipal: 'kibana_system_user' });
        });

        it('returns expected usage data for elastic.username anything else', async () => {
          return doTest({ username: 'anything else', expectedPrincipal: 'other_user' });
        });

        it('returns expected usage data for elastic.serviceAccountToken', async () => {
          // Note: elastic.username and elastic.serviceAccountToken are mutually exclusive
          return doTest({
            serviceAccountToken: 'any',
            expectedPrincipal: 'kibana_service_account',
          });
        });
      });
    });

    describe('getConfigsUsageData', () => {
      const elasticsearch = elasticsearchServiceMock.createStart();
      const typeRegistry = savedObjectsServiceMock.createTypeRegistryMock();
      let exposedConfigsToUsage: Map<string, Record<string, boolean>>;
      beforeEach(() => {
        exposedConfigsToUsage = new Map();
      });

      it('loops over all used configs once each', async () => {
        configService.getUsedPaths.mockResolvedValue([
          'pluginA.objectConfig.debug',
          'logging.json',
        ]);

        exposedConfigsToUsage.set('pluginA', {
          objectConfig: true,
        });

        const { getConfigsUsageData } = service.start({
          savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
          exposedConfigsToUsage,
          elasticsearch,
        });

        const mockGetMarkedAsSafe = jest.fn().mockReturnValue({});
        // @ts-expect-error
        service.getMarkedAsSafe = mockGetMarkedAsSafe;
        await getConfigsUsageData();

        expect(mockGetMarkedAsSafe).toBeCalledTimes(2);
        expect(mockGetMarkedAsSafe.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Map {
                "pluginA" => Object {
                  "objectConfig": true,
                },
              },
              "pluginA.objectConfig.debug",
              "pluginA",
            ],
            Array [
              Map {
                "pluginA" => Object {
                  "objectConfig": true,
                },
              },
              "logging.json",
              undefined,
            ],
          ]
        `);
      });

      it('plucks pluginId from config path correctly', async () => {
        exposedConfigsToUsage.set('pluginA', {
          enabled: false,
        });
        exposedConfigsToUsage.set('pluginAB', {
          enabled: false,
        });

        configService.getUsedPaths.mockResolvedValue(['pluginA.enabled', 'pluginAB.enabled']);

        const { getConfigsUsageData } = service.start({
          savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
          exposedConfigsToUsage,
          elasticsearch,
        });

        await expect(getConfigsUsageData()).resolves.toEqual({
          'pluginA.enabled': '[redacted]',
          'pluginAB.enabled': '[redacted]',
        });
      });

      it('returns an object of plugin config usage', async () => {
        exposedConfigsToUsage.set('unused_config', { never_reported: true });
        exposedConfigsToUsage.set('server', { basePath: true });
        exposedConfigsToUsage.set('pluginA', { elasticsearch: false });
        exposedConfigsToUsage.set('plugins', { paths: false });
        exposedConfigsToUsage.set('pluginA', { arrayOfNumbers: false });

        configService.getUsedPaths.mockResolvedValue([
          'elasticsearch.username',
          'elasticsearch.password',
          'plugins.paths',
          'server.port',
          'server.basePath',
          'server.rewriteBasePath',
          'logging.json',
          'pluginA.enabled',
          'pluginA.objectConfig.debug',
          'pluginA.objectConfig.username',
          'pluginA.arrayOfNumbers',
          'pluginAB.enabled',
          'pluginB.arrayOfObjects',
        ]);

        const { getConfigsUsageData } = service.start({
          savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
          exposedConfigsToUsage,
          elasticsearch,
        });

        await expect(getConfigsUsageData()).resolves.toEqual({
          'elasticsearch.password': '[redacted]',
          'elasticsearch.username': '[redacted]',
          'logging.json': false,
          'pluginA.arrayOfNumbers': '[redacted]',
          'pluginA.enabled': true,
          'pluginA.objectConfig.debug': true,
          'pluginA.objectConfig.username': '[redacted]',
          'pluginAB.enabled': false,
          'pluginB.arrayOfObjects': '[redacted]',
          'plugins.paths': '[redacted]',
          'server.basePath': '/zvt',
          'server.port': 5603,
          'server.rewriteBasePath': true,
        });
      });

      describe('config explicitly exposed to usage', () => {
        it('returns [redacted] on unsafe complete match', async () => {
          exposedConfigsToUsage.set('pluginA', {
            'objectConfig.debug': false,
          });
          exposedConfigsToUsage.set('server', {
            basePath: false,
          });

          configService.getUsedPaths.mockResolvedValue([
            'pluginA.objectConfig.debug',
            'server.basePath',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'pluginA.objectConfig.debug': '[redacted]',
            'server.basePath': '[redacted]',
          });
        });

        it('returns config value on safe complete match', async () => {
          exposedConfigsToUsage.set('server', {
            basePath: true,
          });

          configService.getUsedPaths.mockResolvedValue(['server.basePath']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'server.basePath': '/zvt',
          });
        });

        it('returns [redacted] on unsafe parent match', async () => {
          exposedConfigsToUsage.set('pluginA', {
            objectConfig: false,
          });

          configService.getUsedPaths.mockResolvedValue([
            'pluginA.objectConfig.debug',
            'pluginA.objectConfig.username',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'pluginA.objectConfig.debug': '[redacted]',
            'pluginA.objectConfig.username': '[redacted]',
          });
        });

        it('returns config value on safe parent match', async () => {
          exposedConfigsToUsage.set('pluginA', {
            objectConfig: true,
          });

          configService.getUsedPaths.mockResolvedValue([
            'pluginA.objectConfig.debug',
            'pluginA.objectConfig.username',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'pluginA.objectConfig.debug': true,
            'pluginA.objectConfig.username': 'some_user',
          });
        });

        it('returns [redacted] on explicitly marked as safe array of objects', async () => {
          exposedConfigsToUsage.set('pluginB', {
            arrayOfObjects: true,
          });

          configService.getUsedPaths.mockResolvedValue(['pluginB.arrayOfObjects']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'pluginB.arrayOfObjects': '[redacted]',
          });
        });

        it('returns values on explicitly marked as safe array of numbers', async () => {
          exposedConfigsToUsage.set('pluginA', {
            arrayOfNumbers: true,
          });

          configService.getUsedPaths.mockResolvedValue(['pluginA.arrayOfNumbers']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'pluginA.arrayOfNumbers': [1, 2, 3],
          });
        });

        it('returns values on explicitly marked as safe array of strings', async () => {
          exposedConfigsToUsage.set('plugins', {
            paths: true,
          });

          configService.getUsedPaths.mockResolvedValue(['plugins.paths']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'plugins.paths': ['pluginA', 'pluginAB', 'pluginB'],
          });
        });
      });

      describe('config not explicitly exposed to usage', () => {
        it('returns [redacted] for string configs', async () => {
          exposedConfigsToUsage.set('pluginA', {
            objectConfig: false,
          });

          configService.getUsedPaths.mockResolvedValue([
            'pluginA.objectConfig.debug',
            'pluginA.objectConfig.username',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'pluginA.objectConfig.debug': '[redacted]',
            'pluginA.objectConfig.username': '[redacted]',
          });
        });

        it('returns config value on safe parent match', async () => {
          configService.getUsedPaths.mockResolvedValue([
            'elasticsearch.password',
            'elasticsearch.username',
            'pluginA.objectConfig.username',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'elasticsearch.password': '[redacted]',
            'elasticsearch.username': '[redacted]',
            'pluginA.objectConfig.username': '[redacted]',
          });
        });

        it('returns [redacted] on implicit array of objects', async () => {
          configService.getUsedPaths.mockResolvedValue(['pluginB.arrayOfObjects']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'pluginB.arrayOfObjects': '[redacted]',
          });
        });

        it('returns values on implicit array of numbers', async () => {
          configService.getUsedPaths.mockResolvedValue(['pluginA.arrayOfNumbers']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'pluginA.arrayOfNumbers': [1, 2, 3],
          });
        });

        it('returns [redacted] on implicit array of strings', async () => {
          configService.getUsedPaths.mockResolvedValue(['plugins.paths']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'plugins.paths': '[redacted]',
          });
        });

        it('returns config value for numbers', async () => {
          configService.getUsedPaths.mockResolvedValue(['server.port']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'server.port': 5603,
          });
        });

        it('returns config value for booleans', async () => {
          configService.getUsedPaths.mockResolvedValue([
            'pluginA.objectConfig.debug',
            'logging.json',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'logging.json': false,
            'pluginA.objectConfig.debug': true,
          });
        });

        it('ignores exposed to usage configs but not used', async () => {
          exposedConfigsToUsage.set('pluginA', {
            objectConfig: true,
          });

          configService.getUsedPaths.mockResolvedValue(['logging.json']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toEqual({
            'logging.json': false,
          });
        });
      });
    });
  });

  describe('setup and stop', () => {
    it('subscribes and unsubscribes from all config paths and metrics', () => {
      getTestScheduler().run(({ cold, hot, expectSubscriptions }) => {
        const observables: Array<HotObservable<string>> = [];
        configService.atPath.mockImplementation(() => {
          const newObservable = hot('-a-------');
          observables.push(newObservable);
          return newObservable;
        });
        const http = httpServiceMock.createInternalSetupContract();
        const metrics = metricsServiceMock.createInternalSetupContract();
        metrics.getOpsMetrics$.mockImplementation(() => {
          const newObservable = hot('-a-------');
          observables.push(newObservable);
          return newObservable as Observable<any>;
        });
        const savedObjectsStartPromise = Promise.resolve(
          savedObjectsServiceMock.createStartContract()
        );

        const changedDeprecatedConfigPath$ = configServiceMock.create().getDeprecatedConfigPath$();
        service.setup({ http, metrics, savedObjectsStartPromise, changedDeprecatedConfigPath$ });

        // Use the stopTimer$ to delay calling stop() until the third frame
        const stopTimer$ = cold('---a|');
        stopTimer$.subscribe(() => {
          service.stop();
        });

        const subs = '^--!';

        observables.forEach((o) => {
          expectSubscriptions(o.subscriptions).toBe(subs);
        });
      });
    });
  });
});
