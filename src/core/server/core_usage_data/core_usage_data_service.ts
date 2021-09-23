/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, Observable } from 'rxjs';
import { takeUntil, first } from 'rxjs/operators';
import { get } from 'lodash';
import { hasConfigPathIntersection, ChangedDeprecatedPaths } from '@kbn/config';

import { CoreService } from 'src/core/types';
import { Logger, SavedObjectsServiceStart, SavedObjectTypeRegistry } from 'src/core/server';
import {
  AggregationsFiltersAggregate,
  AggregationsFiltersBucketItem,
  SearchTotalHits,
} from '@elastic/elasticsearch/api/types';
import { CoreContext } from '../core_context';
import { ElasticsearchConfigType } from '../elasticsearch/elasticsearch_config';
import { HttpConfigType, InternalHttpServiceSetup } from '../http';
import { LoggingConfigType } from '../logging';
import { SavedObjectsConfigType } from '../saved_objects/saved_objects_config';
import type {
  CoreServicesUsageData,
  CoreUsageData,
  CoreUsageDataStart,
  InternalCoreUsageDataSetup,
  ConfigUsageData,
  CoreConfigUsageData,
} from './types';
import { isConfigured } from './is_configured';
import { ElasticsearchServiceStart } from '../elasticsearch';
import { KibanaConfigType } from '../kibana_config';
import { coreUsageStatsType } from './core_usage_stats';
import { LEGACY_URL_ALIAS_TYPE } from '../saved_objects/object_types';
import { CORE_USAGE_STATS_TYPE } from './constants';
import { CoreUsageStatsClient } from './core_usage_stats_client';
import { MetricsServiceSetup, OpsMetrics } from '..';
import { CoreIncrementUsageCounter } from './types';

export type ExposedConfigsToUsage = Map<string, Record<string, boolean>>;

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  metrics: MetricsServiceSetup;
  savedObjectsStartPromise: Promise<SavedObjectsServiceStart>;
  changedDeprecatedConfigPath$: Observable<ChangedDeprecatedPaths>;
}

export interface StartDeps {
  savedObjects: SavedObjectsServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  exposedConfigsToUsage: ExposedConfigsToUsage;
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

export class CoreUsageDataService
  implements CoreService<InternalCoreUsageDataSetup, CoreUsageDataStart>
{
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
  private deprecatedConfigPaths: ChangedDeprecatedPaths = { set: [], unset: [] };
  private incrementUsageCounter: CoreIncrementUsageCounter = () => {}; // Initially set to noop

  constructor(core: CoreContext) {
    this.logger = core.logger.get('core-usage-stats-service');
    this.configService = core.configService;
    this.stop$ = new Subject();
  }

  private async getSavedObjectUsageData(
    savedObjects: SavedObjectsServiceStart,
    elasticsearch: ElasticsearchServiceStart
  ): Promise<CoreServicesUsageData['savedObjects']> {
    const [indices, legacyUrlAliases] = await Promise.all([
      this.getSavedObjectIndicesUsageData(savedObjects, elasticsearch),
      this.getSavedObjectAliasUsageData(elasticsearch),
    ]);
    return {
      indices,
      legacyUrlAliases,
    };
  }

  private async getSavedObjectIndicesUsageData(
    savedObjects: SavedObjectsServiceStart,
    elasticsearch: ElasticsearchServiceStart
  ) {
    return Promise.all(
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
              docsCount: stats['docs.count'] ? parseInt(stats['docs.count'], 10) : 0,
              docsDeleted: stats['docs.deleted'] ? parseInt(stats['docs.deleted'], 10) : 0,
              storeSizeBytes: stats['store.size'] ? parseInt(stats['store.size'], 10) : 0,
              primaryStoreSizeBytes: stats['pri.store.size']
                ? parseInt(stats['pri.store.size'], 10)
                : 0,
            };
          });
      })
    );
  }

  private async getSavedObjectAliasUsageData(elasticsearch: ElasticsearchServiceStart) {
    // Note: this agg can be changed to use `savedObjectsRepository.find` in the future after `filters` is supported.
    // See src/core/server/saved_objects/service/lib/aggregations/aggs_types/bucket_aggs.ts for supported aggregations.
    const { body: resp } = await elasticsearch.client.asInternalUser.search({
      index: this.kibanaConfig!.index,
      body: {
        track_total_hits: true,
        query: { match: { type: LEGACY_URL_ALIAS_TYPE } },
        aggs: {
          aliases: {
            filters: {
              filters: {
                disabled: { term: { [`${LEGACY_URL_ALIAS_TYPE}.disabled`]: true } },
                active: {
                  bool: {
                    must_not: { term: { [`${LEGACY_URL_ALIAS_TYPE}.disabled`]: true } },
                    must: { range: { [`${LEGACY_URL_ALIAS_TYPE}.resolveCounter`]: { gte: 1 } } },
                  },
                },
              },
            },
          },
        },
        size: 0,
      },
    });

    const { hits, aggregations } = resp;
    const totalCount = (hits.total as SearchTotalHits).value;
    const aggregate = aggregations!.aliases as AggregationsFiltersAggregate;
    const buckets = aggregate.buckets as Record<string, AggregationsFiltersBucketItem>;
    const disabledCount = buckets.disabled.doc_count as number;
    const activeCount = buckets.active.doc_count as number;
    const inactiveCount = totalCount - disabledCount - activeCount;

    return { totalCount, disabledCount, activeCount, inactiveCount };
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
    const soUsageData = await this.getSavedObjectUsageData(savedObjects, elasticsearch);
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
          principal: getEsPrincipalUsage(es),
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
          securityResponseHeaders: {
            // ES does not index `null` and it cannot be searched, so we coalesce these to string values instead
            strictTransportSecurity: http.securityResponseHeaders.strictTransportSecurity ?? 'NULL',
            xContentTypeOptions: http.securityResponseHeaders.xContentTypeOptions ?? 'NULL',
            referrerPolicy: http.securityResponseHeaders.referrerPolicy ?? 'NULL',
            permissionsPolicyConfigured: isConfigured.string(
              http.securityResponseHeaders.permissionsPolicy ?? undefined
            ),
            disableEmbedding: http.securityResponseHeaders.disableEmbedding,
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
          maxImportExportSize: this.soConfig.maxImportExportSize,
        },

        deprecatedKeys: this.deprecatedConfigPaths,
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

  private getMarkedAsSafe(
    exposedConfigsToUsage: ExposedConfigsToUsage,
    usedPath: string,
    pluginId?: string
  ): { explicitlyMarked: boolean; isSafe: boolean } {
    if (pluginId) {
      const exposeDetails = exposedConfigsToUsage.get(pluginId) || {};
      const exposeKeyDetails = Object.keys(exposeDetails).find((exposeKey) => {
        const fullPath = `${pluginId}.${exposeKey}`;
        return hasConfigPathIntersection(usedPath, fullPath);
      });

      if (exposeKeyDetails) {
        const explicitlyMarkedAsSafe = exposeDetails[exposeKeyDetails];

        if (typeof explicitlyMarkedAsSafe === 'boolean') {
          return {
            explicitlyMarked: true,
            isSafe: explicitlyMarkedAsSafe,
          };
        }
      }
    }

    return { explicitlyMarked: false, isSafe: false };
  }

  private async getNonDefaultKibanaConfigs(
    exposedConfigsToUsage: ExposedConfigsToUsage
  ): Promise<ConfigUsageData> {
    const config = await this.configService.getConfig$().pipe(first()).toPromise();
    const nonDefaultConfigs = config.toRaw();
    const usedPaths = await this.configService.getUsedPaths();
    const exposedConfigsKeys = [...exposedConfigsToUsage.keys()];

    return usedPaths.reduce((acc, usedPath) => {
      const rawConfigValue = get(nonDefaultConfigs, usedPath);
      const pluginId = exposedConfigsKeys.find(
        (exposedConfigsKey) =>
          usedPath === exposedConfigsKey || usedPath.startsWith(`${exposedConfigsKey}.`)
      );

      const { explicitlyMarked, isSafe } = this.getMarkedAsSafe(
        exposedConfigsToUsage,
        usedPath,
        pluginId
      );

      // explicitly marked as safe
      if (explicitlyMarked && isSafe) {
        // report array of objects as redacted even if explicitly marked as safe.
        // TS typings prevent explicitly marking arrays of objects as safe
        // this makes sure to report redacted even if TS was bypassed.
        if (
          Array.isArray(rawConfigValue) &&
          rawConfigValue.some((item) => typeof item === 'object')
        ) {
          acc[usedPath] = '[redacted]';
        } else {
          acc[usedPath] = rawConfigValue;
        }
      }

      // explicitly marked as unsafe
      if (explicitlyMarked && !isSafe) {
        acc[usedPath] = '[redacted]';
      }

      /**
       * not all types of values may contain sensitive values.
       * Report boolean and number configs if not explicitly marked as unsafe.
       */
      if (!explicitlyMarked) {
        switch (typeof rawConfigValue) {
          case 'number':
          case 'boolean':
            acc[usedPath] = rawConfigValue;
            break;
          case 'undefined':
            acc[usedPath] = 'undefined';
            break;
          case 'object': {
            // non-array object types are already handled
            if (Array.isArray(rawConfigValue)) {
              if (
                rawConfigValue.every(
                  (item) => typeof item === 'number' || typeof item === 'boolean'
                )
              ) {
                acc[usedPath] = rawConfigValue;
                break;
              }
            }
          }
          default: {
            acc[usedPath] = '[redacted]';
          }
        }
      }

      return acc;
    }, {} as Record<string, any | any[]>);
  }

  setup({ http, metrics, savedObjectsStartPromise, changedDeprecatedConfigPath$ }: SetupDeps) {
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

    changedDeprecatedConfigPath$
      .pipe(takeUntil(this.stop$))
      .subscribe((deprecatedConfigPaths) => (this.deprecatedConfigPaths = deprecatedConfigPaths));

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

    const contract: InternalCoreUsageDataSetup = {
      registerType,
      getClient,
      registerUsageCounter: (usageCounter) => {
        this.incrementUsageCounter = (params) => usageCounter.incrementCounter(params);
      },
      incrementUsageCounter: (params) => {
        try {
          this.incrementUsageCounter(params);
        } catch (e) {
          // Self-defense mechanism since the handler is externally registered
          this.logger.debug('Failed to increase the usage counter');
          this.logger.debug(e);
        }
      },
    };

    return contract;
  }

  start({ savedObjects, elasticsearch, exposedConfigsToUsage }: StartDeps) {
    return {
      getCoreUsageData: async () => {
        return await this.getCoreUsageData(savedObjects, elasticsearch);
      },
      getConfigsUsageData: async () => {
        return await this.getNonDefaultKibanaConfigs(exposedConfigsToUsage);
      },
    };
  }

  stop() {
    this.stop$.next();
    this.stop$.complete();
  }
}

function getEsPrincipalUsage({ username, serviceAccountToken }: ElasticsearchConfigType) {
  let value: CoreConfigUsageData['elasticsearch']['principal'] = 'unknown';
  if (isConfigured.string(username)) {
    switch (username) {
      case 'elastic': // deprecated
      case 'kibana': // deprecated
      case 'kibana_system':
        value = `${username}_user` as const;
        break;
      default:
        value = 'other_user';
    }
  } else if (serviceAccountToken) {
    // cannot be used with elasticsearch.username
    value = 'kibana_service_account';
  }
  return value;
}
