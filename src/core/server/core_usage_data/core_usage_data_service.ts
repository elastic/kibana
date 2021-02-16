/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CoreService } from 'src/core/types';
import { Logger, SavedObjectsServiceStart, SavedObjectTypeRegistry } from 'src/core/server';
import { CoreContext } from '../core_context';
import { ElasticsearchConfigType } from '../elasticsearch/elasticsearch_config';
import { HttpConfigType, InternalHttpServiceSetup } from '../http';
import { LoggingConfigType } from '../logging';
import { SavedObjectsConfigType } from '../saved_objects/saved_objects_config';
import {
  CoreServicesUsageData,
  CoreUsageData,
  CoreUsageDataStart,
  CoreUsageDataSetup,
} from './types';
import { isConfigured } from './is_configured';
import { ElasticsearchServiceStart } from '../elasticsearch';
import { KibanaConfigType } from '../kibana_config';
import { coreUsageStatsType } from './core_usage_stats';
import { CORE_USAGE_STATS_TYPE } from './constants';
import { CoreUsageStatsClient } from './core_usage_stats_client';
import { MetricsServiceSetup, OpsMetrics } from '..';

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  metrics: MetricsServiceSetup;
  savedObjectsStartPromise: Promise<SavedObjectsServiceStart>;
}

export interface StartDeps {
  savedObjects: SavedObjectsServiceStart;
  elasticsearch: ElasticsearchServiceStart;
}

/**
 * Because users can configure their Saved Object to any arbitrary index name,
 * we need to map customized index names back to a "standard" index name.
 *
 * e.g. If a user configures `kibana.index: .my_saved_objects` we want to the
 * collected data to be grouped under `.kibana` not ".my_saved_objects".
 *
 * This is rather brittle, but the option to configure index names might go
 * away completely anyway (see #60053).
 *
 * @param index The index name configured for this SO type
 * @param kibanaConfigIndex The default kibana index as configured by the user
 * with `kibana.index`
 */
const kibanaOrTaskManagerIndex = (index: string, kibanaConfigIndex: string) => {
  return index === kibanaConfigIndex ? '.kibana' : '.kibana_task_manager';
};

/**
 * This is incredibly hacky... The config service doesn't allow you to determine
 * whether or not a config value has been changed from the default value, and the
 * default value is defined in legacy code.
 *
 * This will be going away in 8.0, so please look away for a few months
 *
 * @param index The `kibana.index` setting from the `kibana.yml`
 */
const isCustomIndex = (index: string) => {
  return index !== '.kibana';
};

export class CoreUsageDataService implements CoreService<CoreUsageDataSetup, CoreUsageDataStart> {
  private logger: Logger;
  private elasticsearchConfig?: ElasticsearchConfigType;
  private configService: CoreContext['configService'];
  private httpConfig?: HttpConfigType;
  private loggingConfig?: LoggingConfigType;
  private soConfig?: SavedObjectsConfigType;
  private stop$: Subject<void>;
  private opsMetrics?: OpsMetrics;
  private kibanaConfig?: KibanaConfigType;
  private coreUsageStatsClient?: CoreUsageStatsClient;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('core-usage-stats-service');
    this.configService = core.configService;
    this.stop$ = new Subject();
  }

  private async getSavedObjectIndicesUsageData(
    savedObjects: SavedObjectsServiceStart,
    elasticsearch: ElasticsearchServiceStart
  ): Promise<CoreServicesUsageData['savedObjects']> {
    const indices = await Promise.all(
      Array.from(
        savedObjects
          .getTypeRegistry()
          .getAllTypes()
          .reduce((acc, type) => {
            const index = type.indexPattern ?? this.kibanaConfig!.index;
            return index != null ? acc.add(index) : acc;
          }, new Set<string>())
          .values()
      ).map((index) => {
        // The _cat/indices API returns the _index_ and doesn't return a way
        // to map back from the index to the alias. So we have to make an API
        // call for every alias
        return elasticsearch.client.asInternalUser.cat
          .indices<any[]>({
            index,
            format: 'JSON',
            bytes: 'b',
          })
          .then(({ body }) => {
            const stats = body[0];
            return {
              alias: kibanaOrTaskManagerIndex(index, this.kibanaConfig!.index),
              docsCount: stats['docs.count'],
              docsDeleted: stats['docs.deleted'],
              storeSizeBytes: stats['store.size'],
              primaryStoreSizeBytes: stats['pri.store.size'],
            };
          });
      })
    );

    return {
      indices,
    };
  }

  private async getCoreUsageData(
    savedObjects: SavedObjectsServiceStart,
    elasticsearch: ElasticsearchServiceStart
  ): Promise<CoreUsageData> {
    if (
      this.elasticsearchConfig == null ||
      this.httpConfig == null ||
      this.soConfig == null ||
      this.opsMetrics == null
    ) {
      throw new Error('Unable to read config values. Ensure that setup() has completed.');
    }

    if (!this.coreUsageStatsClient) {
      throw new Error(
        'Core usage stats client is not initialized. Ensure that setup() has completed.'
      );
    }

    const es = this.elasticsearchConfig;
    const soUsageData = await this.getSavedObjectIndicesUsageData(savedObjects, elasticsearch);
    const coreUsageStatsData = await this.coreUsageStatsClient.getUsageStats();

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
            allowlistConfigured: isConfigured.array(http.xsrf.allowlist),
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
              .reduce((acc, a) => acc.add(a.type), new Set<string>())
              .values()
          ),
          loggersConfiguredCount: this.loggingConfig?.loggers.length ?? 0,
        },

        savedObjects: {
          customIndex: isCustomIndex(this.kibanaConfig!.index),
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
      },
      services: {
        savedObjects: soUsageData,
      },
      ...coreUsageStatsData,
    };
  }

  setup({ http, metrics, savedObjectsStartPromise }: SetupDeps) {
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

    this.configService
      .atPath<KibanaConfigType>('kibana')
      .pipe(takeUntil(this.stop$))
      .subscribe((config) => {
        this.kibanaConfig = config;
      });

    const internalRepositoryPromise = savedObjectsStartPromise.then((savedObjects) =>
      savedObjects.createInternalRepository([CORE_USAGE_STATS_TYPE])
    );

    const registerType = (typeRegistry: SavedObjectTypeRegistry) => {
      typeRegistry.registerType(coreUsageStatsType);
    };

    const getClient = () => {
      const debugLogger = (message: string) => this.logger.debug(message);

      return new CoreUsageStatsClient(debugLogger, http.basePath, internalRepositoryPromise);
    };

    this.coreUsageStatsClient = getClient();

    return { registerType, getClient } as CoreUsageDataSetup;
  }

  start({ savedObjects, elasticsearch }: StartDeps) {
    return {
      getCoreUsageData: () => {
        return this.getCoreUsageData(savedObjects, elasticsearch);
      },
    };
  }

  stop() {
    this.stop$.next();
    this.stop$.complete();
  }
}
