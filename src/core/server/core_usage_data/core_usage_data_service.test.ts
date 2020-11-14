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
import { metricsServiceMock } from '../metrics/metrics_service.mock';
import { savedObjectsServiceMock } from '../saved_objects/saved_objects_service.mock';

import { CoreUsageDataService } from './core_usage_data_service';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';

describe('CoreUsageDataService', () => {
  const getTestScheduler = () =>
    new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

  let service: CoreUsageDataService;
  const configService = configServiceMock.create();
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

  describe('start', () => {
    describe('getCoreUsageData', () => {
      it('returns core metrics for default config', () => {
        const metrics = metricsServiceMock.createInternalSetupContract();
        service.setup({ metrics });
        const elasticsearch = elasticsearchServiceMock.createStart();
        elasticsearch.client.asInternalUser.cat.indices.mockResolvedValueOnce({
          body: [
            {
              name: '.kibana_task_manager_1',
              'docs.count': 10,
              'docs.deleted': 10,
              'store.size': 1000,
              'pri.store.size': 2000,
            },
          ],
        } as any);
        elasticsearch.client.asInternalUser.cat.indices.mockResolvedValueOnce({
          body: [
            {
              name: '.kibana_1',
              'docs.count': 20,
              'docs.deleted': 20,
              'store.size': 2000,
              'pri.store.size': 4000,
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
          elasticsearch,
        });
        expect(getCoreUsageData()).resolves.toMatchInlineSnapshot(`
          Object {
            "config": Object {
              "elasticsearch": Object {
                "apiVersion": "7.x",
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
                  "disableProtection": false,
                  "whitelistConfigured": false,
                },
              },
              "logging": Object {
                "appendersTypesUsed": Array [],
                "loggersConfiguredCount": 0,
              },
              "savedObjects": Object {
                "maxImportExportSizeBytes": 10000,
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
        const metrics = metricsServiceMock.createInternalSetupContract();
        metrics.getOpsMetrics$.mockImplementation(() => {
          const newObservable = hot('-a-------');
          observables.push(newObservable);
          return newObservable as Observable<any>;
        });

        service.setup({ metrics });

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
