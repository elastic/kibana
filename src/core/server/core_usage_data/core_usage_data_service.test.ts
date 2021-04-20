/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { HotObservable } from 'rxjs/internal/testing/HotObservable';
import { TestScheduler } from 'rxjs/testing';

import { configServiceMock } from '../config/mocks';

import { mockCoreContext } from '../core_context.mock';
import { config as RawElasticsearchConfig } from '../elasticsearch/elasticsearch_config';
import { config as RawHttpConfig } from '../http/http_config';
import { config as RawLoggingConfig } from '../logging/logging_config';
import { config as RawKibanaConfig } from '../kibana_config';
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
  const getTestScheduler = () =>
    new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

  let service: CoreUsageDataService;
  const mockConfig = {
    ui_metric: {},
    elasticsearch: { username: 'kibana_system', password: 'changeme' },
    plugins: { paths: ['some_path', 'another_path'] },
    server: { port: 5603, basePath: '/zvt', rewriteBasePath: true },
    logging: { json: false },
    usageCollection: {
      uiCounters: {
        debug: true,
        username: 'some_user',
      },
    },
  };

  const configService = configServiceMock.create({
    getConfig$: mockConfig,
  });

  configService.atPath.mockImplementation((path) => {
    if (path === 'elasticsearch') {
      return new BehaviorSubject(RawElasticsearchConfig.schema.validate({}));
    } else if (path === 'server') {
      return new BehaviorSubject(RawHttpConfig.schema.validate({}));
    } else if (path === 'logging') {
      return new BehaviorSubject(RawLoggingConfig.schema.validate({}));
    } else if (path === 'savedObjects') {
      return new BehaviorSubject(RawSavedObjectsConfig.schema.validate({}));
    } else if (path === 'kibana') {
      return new BehaviorSubject(RawKibanaConfig.schema.validate({}));
    }
    return new BehaviorSubject({});
  });
  const coreContext = mockCoreContext.create({ configService });

  beforeEach(() => {
    service = new CoreUsageDataService(coreContext);
  });

  describe('setup', () => {
    it('creates internal repository', async () => {
      const http = httpServiceMock.createInternalSetupContract();
      const metrics = metricsServiceMock.createInternalSetupContract();
      const savedObjectsStartPromise = Promise.resolve(
        savedObjectsServiceMock.createStartContract()
      );
      service.setup({ http, metrics, savedObjectsStartPromise });

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
        const coreUsageData = service.setup({ http, metrics, savedObjectsStartPromise });
        const typeRegistry = typeRegistryMock.create();

        coreUsageData.registerType(typeRegistry);
        expect(typeRegistry.registerType).toHaveBeenCalledTimes(1);
        expect(typeRegistry.registerType).toHaveBeenCalledWith({
          name: CORE_USAGE_STATS_TYPE,
          hidden: true,
          namespaceType: 'agnostic',
          mappings: expect.anything(),
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
        const coreUsageData = service.setup({ http, metrics, savedObjectsStartPromise });

        const usageStatsClient = coreUsageData.getClient();
        expect(usageStatsClient).toBeInstanceOf(CoreUsageStatsClient);
      });
    });
  });

  describe('start', () => {
    describe('getCoreUsageData', () => {
      it('returns core metrics for default config', async () => {
        const http = httpServiceMock.createInternalSetupContract();
        const metrics = metricsServiceMock.createInternalSetupContract();
        const savedObjectsStartPromise = Promise.resolve(
          savedObjectsServiceMock.createStartContract()
        );
        service.setup({ http, metrics, savedObjectsStartPromise });
        const elasticsearch = elasticsearchServiceMock.createStart();
        elasticsearch.client.asInternalUser.cat.indices.mockResolvedValueOnce({
          body: [
            {
              name: '.kibana_task_manager_1',
              'docs.count': '10',
              'docs.deleted': '10',
              'store.size': '1000',
              'pri.store.size': '2000',
            },
          ],
        } as any);
        elasticsearch.client.asInternalUser.cat.indices.mockResolvedValueOnce({
          body: [
            {
              name: '.kibana_1',
              'docs.count': '20',
              'docs.deleted': '20',
              'store.size': '2000',
              'pri.store.size': '4000',
            },
          ],
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
        expect(getCoreUsageData()).resolves.toMatchInlineSnapshot(`
          Object {
            "config": Object {
              "elasticsearch": Object {
                "apiVersion": "master",
                "customHeadersConfigured": false,
                "healthCheckDelayMs": 2500,
                "logQueries": false,
                "numberOfHostsConfigured": 1,
                "pingTimeoutMs": 30000,
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
                    "storeSizeBytes": 1000,
                  },
                  Object {
                    "alias": ".kibana_task_manager",
                    "docsCount": 20,
                    "docsDeleted": 20,
                    "primaryStoreSizeBytes": 4000,
                    "storeSizeBytes": 2000,
                  },
                ],
              },
            },
          }
        `);
      });
    });

    describe('getConfigsUsageData', () => {
      const elasticsearch = elasticsearchServiceMock.createStart();
      const typeRegistry = savedObjectsServiceMock.createTypeRegistryMock();
      let exposedConfigsToUsage: Map<string, Record<string, boolean>>;
      beforeEach(() => {
        exposedConfigsToUsage = new Map();
      });

      describe('config explicitly exposed to usage', () => {
        it('returns [redacted] on unsafe complete match', async () => {
          exposedConfigsToUsage.set('usageCollection', {
            'uiCounters.debug': false,
          });
          exposedConfigsToUsage.set('server', {
            basePath: false,
          });

          configService.getUsedPaths.mockResolvedValue([
            'usageCollection.uiCounters.debug',
            'server.basePath',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "server.basePath": "[redacted]",
              "usageCollection.uiCounters.debug": "[redacted]",
            }
          `);
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

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "server.basePath": "/zvt",
            }
          `);
        });

        it('returns [redacted] on unsafe parent match', async () => {
          exposedConfigsToUsage.set('usageCollection', {
            uiCounters: false,
          });

          configService.getUsedPaths.mockResolvedValue([
            'usageCollection.uiCounters.debug',
            'usageCollection.uiCounters.username',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "usageCollection.uiCounters.debug": "[redacted]",
              "usageCollection.uiCounters.username": "[redacted]",
            }
          `);
        });

        it('returns config value on safe parent match', async () => {
          exposedConfigsToUsage.set('usageCollection', {
            uiCounters: true,
          });

          configService.getUsedPaths.mockResolvedValue([
            'usageCollection.uiCounters.debug',
            'usageCollection.uiCounters.username',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "usageCollection.uiCounters.debug": true,
              "usageCollection.uiCounters.username": "some_user",
            }
          `);
        });

        it('returns [redacted] on implicit arrays', async () => {
          exposedConfigsToUsage.set('plugins', {
            paths: true,
          });

          configService.getUsedPaths.mockResolvedValue(['plugins.paths']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "plugins.paths": Array [
                "some_path",
                "another_path",
              ],
            }
          `);
        });
      });

      describe('config not explicitly exposed to usage', () => {
        it('returns [redacted] for string configs', async () => {
          exposedConfigsToUsage.set('usageCollection', {
            uiCounters: false,
          });

          configService.getUsedPaths.mockResolvedValue([
            'usageCollection.uiCounters.debug',
            'usageCollection.uiCounters.username',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "usageCollection.uiCounters.debug": "[redacted]",
              "usageCollection.uiCounters.username": "[redacted]",
            }
          `);
        });

        it('returns config value on safe parent match', async () => {
          configService.getUsedPaths.mockResolvedValue([
            'elasticsearch.password',
            'elasticsearch.username',
            'usageCollection.uiCounters.username',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "elasticsearch.password": "[redacted]",
              "elasticsearch.username": "[redacted]",
              "usageCollection.uiCounters.username": "[redacted]",
            }
          `);
        });

        it('returns [redacted] on implicit arrays', async () => {
          configService.getUsedPaths.mockResolvedValue(['plugins.paths']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "plugins.paths": "[redacted]",
            }
          `);
        });

        it('returns config value for numbers', async () => {
          configService.getUsedPaths.mockResolvedValue(['server.port']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "server.port": 5603,
            }
          `);
        });

        it('returns config value for booleans', async () => {
          configService.getUsedPaths.mockResolvedValue([
            'usageCollection.uiCounters.debug',
            'logging.json',
          ]);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "logging.json": false,
              "usageCollection.uiCounters.debug": true,
            }
          `);
        });

        it('ignores exposed to usage configs but not used', async () => {
          exposedConfigsToUsage.set('usageCollection', {
            uiCounters: true,
          });

          configService.getUsedPaths.mockResolvedValue(['logging.json']);

          const { getConfigsUsageData } = service.start({
            savedObjects: savedObjectsServiceMock.createInternalStartContract(typeRegistry),
            exposedConfigsToUsage,
            elasticsearch,
          });

          await expect(getConfigsUsageData()).resolves.toMatchInlineSnapshot(`
            Object {
              "logging.json": false,
            }
          `);
        });
      });

      it('loops over all used configs once each', async () => {
        configService.getUsedPaths.mockResolvedValue([
          'usageCollection.uiCounters.debug',
          'logging.json',
        ]);

        exposedConfigsToUsage.set('usageCollection', {
          uiCounters: true,
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
                "usageCollection" => Object {
                  "uiCounters": true,
                },
              },
              "usageCollection",
              "usageCollection.uiCounters.debug",
            ],
            Array [
              Map {
                "usageCollection" => Object {
                  "uiCounters": true,
                },
              },
              undefined,
              "logging.json",
            ],
          ]
        `);
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

        service.setup({ http, metrics, savedObjectsStartPromise });

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
