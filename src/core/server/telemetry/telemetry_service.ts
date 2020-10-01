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

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CoreService } from 'src/core/types';
import { CoreContext } from '../core_context';
import { ElasticsearchConfigType } from '../elasticsearch/elasticsearch_config';
import { HttpConfigType } from '../http';
import { Logger, LoggingConfigType } from '../logging';
import { SavedObjectsConfigType } from '../saved_objects/saved_objects_config';
import { CoreTelemetry, CoreTelemetryStart } from './types';
import { SavedObjectsService } from '../saved_objects';
import { isConfigured } from './is_configured';
import { MetricsServiceSetup, OpsMetrics } from '..';

export interface SetupDeps {
  metrics: MetricsServiceSetup;
}

export interface StartDeps {
  savedObjectsService: SavedObjectsService;
}

export class CoreTelemetryService implements CoreService<void, CoreTelemetryStart> {
  private readonly log: Logger;
  private elasticsearchConfig?: ElasticsearchConfigType;
  private configService: CoreContext['configService'];
  private httpConfig?: HttpConfigType;
  private loggingConfig?: LoggingConfigType;
  private soConfig?: SavedObjectsConfigType;
  private stop$: Subject<void>;
  private opsMetrics?: OpsMetrics;

  constructor(core: CoreContext) {
    this.log = core.logger.get('core_telemetry');
    this.configService = core.configService;
    this.stop$ = new Subject();
  }

  private getCoreTelemetry(): CoreTelemetry {
    if (
      this.elasticsearchConfig == null ||
      this.httpConfig == null ||
      this.soConfig == null ||
      this.opsMetrics == null
    ) {
      throw new Error('Unable to read config values. Ensure that setup() has completed.');
    }

    const es = this.elasticsearchConfig;

    const http = this.httpConfig;
    return {
      config: {
        elasticsearch: {
          apiVersion: es.apiVersion,
          sniffOnStart: es.sniffOnStart,
          sniffIntervalMs: es.sniffInterval !== false ? es.sniffInterval.asMilliseconds() : -1,
          sniffOnConnectionFault: es.sniffOnConnectionFault,
          numberOfHostsConfigured: Array.isArray(es.hosts)
            ? es.hosts.length
            : isConfigured.string(es.hosts)
            ? 1
            : 0,
          customHeadersConfigured: isConfigured.record(es.customHeaders),
          healthCheckDelayMs: es.healthCheck.delay.asMilliseconds(),
          logQueries: es.logQueries,
          pingTimeoutMs: es.pingTimeout.asMilliseconds(),
          requestHeadersWhitelistConfigured: isConfigured.stringOrArray(
            es.requestHeadersWhitelist,
            ['authorization']
          ),
          requestTimeoutMs: es.requestTimeout.asMilliseconds(),
          shardTimeoutMs: es.shardTimeout.asMilliseconds(),
          ssl: {
            alwaysPresentCertificate: es.ssl.alwaysPresentCertificate,
            certificateAuthoritiesConfigured: isConfigured.stringOrArray(
              es.ssl.certificateAuthorities
            ),
            certificateConfigured: isConfigured.string(es.ssl.certificate),
            keyConfigured: isConfigured.string(es.ssl.key),
            verificationMode: es.ssl.verificationMode,
            truststoreConfigured: isConfigured.record(es.ssl.truststore),
            keystoreConfigured: isConfigured.record(es.ssl.keystore),
          },
        },
        http: {
          basePathConfigured: isConfigured.string(http.basePath),
          maxPayloadInBytes: http.maxPayload.getValueInBytes(),
          rewriteBasePath: http.rewriteBasePath,
          keepaliveTimeout: http.keepaliveTimeout,
          socketTimeout: http.socketTimeout,
          compression: {
            enabled: http.compression.enabled,
            referrerWhitelistConfigured: isConfigured.array(http.compression.referrerWhitelist),
          },
          xsrf: {
            disableProtection: http.xsrf.disableProtection,
            whitelistConfigured: isConfigured.array(http.xsrf.whitelist),
          },
          requestId: {
            allowFromAnyIp: http.requestId.allowFromAnyIp,
            ipAllowlistConfigured: isConfigured.array(http.requestId.ipAllowlist),
          },
          ssl: {
            certificateAuthoritiesConfigured: isConfigured.stringOrArray(
              http.ssl.certificateAuthorities
            ),
            certificateConfigured: isConfigured.string(http.ssl.certificate),
            cipherSuites: http.ssl.cipherSuites,
            keyConfigured: isConfigured.string(http.ssl.key),
            redirectHttpFromPortConfigured: isConfigured.number(http.ssl.redirectHttpFromPort),
            supportedProtocols: http.ssl.supportedProtocols,
            clientAuthentication: http.ssl.clientAuthentication,
            keystoreConfigured: isConfigured.record(http.ssl.keystore),
            truststoreConfigured: isConfigured.record(http.ssl.truststore),
          },
        },

        logging: {
          appendersTypesUsed: Array.from(
            Array.from(this.loggingConfig?.appenders.values() ?? [])
              .reduce((acc, a) => acc.add(a.kind), new Set<string>())
              .values()
          ),
          loggersConfiguredCount: this.loggingConfig?.loggers.length ?? 0,
        },

        savedObjects: {
          maxImportPayloadBytes: this.soConfig.maxImportPayloadBytes.getValueInBytes(),
          maxImportExportSizeBytes: this.soConfig.maxImportExportSize.getValueInBytes(),
        },
      },
      environment: {
        memory: {
          heapSizeLimit: this.opsMetrics.process.memory.heap.size_limit,
          heapTotalBytes: this.opsMetrics.process.memory.heap.total_in_bytes,
          heapUsedBytes: this.opsMetrics.process.memory.heap.used_in_bytes,
        },
        os: {
          platform: this.opsMetrics.os.platform,
          platformRelease: this.opsMetrics.os.platformRelease,
        },
      },
    };
  }

  setup({ metrics }: SetupDeps) {
    metrics
      .getOpsMetrics$()
      .pipe(takeUntil(this.stop$))
      .subscribe((opsMetrics) => (this.opsMetrics = opsMetrics));

    this.configService
      .atPath<ElasticsearchConfigType>('elasticsearch')
      .pipe(takeUntil(this.stop$))
      .subscribe((config) => {
        this.elasticsearchConfig = config;
      });

    this.configService
      .atPath<HttpConfigType>('server')
      .pipe(takeUntil(this.stop$))
      .subscribe((config) => {
        this.httpConfig = config;
      });

    this.configService
      .atPath<LoggingConfigType>('logging')
      .pipe(takeUntil(this.stop$))
      .subscribe((config) => {
        this.loggingConfig = config;
      });

    this.configService
      .atPath<SavedObjectsConfigType>('savedObjects')
      .pipe(takeUntil(this.stop$))
      .subscribe((config) => {
        this.soConfig = config;
      });
  }

  start() {
    return {
      getCoreTelemetry: () => {
        try {
          return this.getCoreTelemetry();
        } catch (e) {
          this.log.error('Error collecting core telemetry', e);
          return null;
        }
      },
    };
  }

  stop() {
    this.stop$.next();
    this.stop$.complete();
  }
}
