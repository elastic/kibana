/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs';
import { get } from 'lodash';
import type { ChangedDeprecatedPaths } from '@kbn/config';
import { hasConfigPathIntersection } from '@kbn/config';

import type {
  AggregationsMultiBucketAggregateBase,
  AggregationsSingleBucketAggregateBase,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { LoggingConfigType } from '@kbn/core-logging-server-internal';
import type { Logger } from '@kbn/logging';
import type { HttpConfigType, InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { ElasticsearchConfigType } from '@kbn/core-elasticsearch-server-internal';
import type { MetricsServiceSetup, OpsMetrics } from '@kbn/core-metrics-server';
import {
  LEGACY_URL_ALIAS_TYPE,
  type SavedObjectsConfigType,
} from '@kbn/core-saved-objects-base-server-internal';
import type {
  CoreServicesUsageData,
  CoreUsageData,
  CoreUsageDataStart,
  CoreIncrementUsageCounter,
  ConfigUsageData,
  CoreConfigUsageData,
  CoreIncrementCounterParams,
  CoreUsageCounter,
  DeprecatedApiUsageFetcher,
} from '@kbn/core-usage-data-server';
import {
  CORE_USAGE_STATS_TYPE,
  type InternalCoreUsageDataSetup,
} from '@kbn/core-usage-data-base-server-internal';
import type { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import {
  MAIN_SAVED_OBJECT_INDEX,
  type SavedObjectsServiceStart,
} from '@kbn/core-saved-objects-server';

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { isConfigured } from './is_configured';
import { coreUsageStatsType } from './saved_objects';
import { CoreUsageStatsClient } from './core_usage_stats_client';

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

interface UsageDataAggs extends AggregationsMultiBucketAggregateBase {
  buckets: {
    disabled: AggregationsSingleBucketAggregateBase;
    active: AggregationsSingleBucketAggregateBase;
  };
}

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
  private coreUsageStatsClient?: CoreUsageStatsClient;
  private deprecatedConfigPaths: ChangedDeprecatedPaths = { set: [], unset: [] };
  private incrementUsageCounter: CoreIncrementUsageCounter = () => {}; // Initially set to noop
  private deprecatedApiUsageFetcher: DeprecatedApiUsageFetcher = async () => []; // Initially set to noop

  constructor(core: CoreContext) {
    this.logger = core.logger.get('core-usage-stats-service');
    this.configService = core.configService;
    this.stop$ = new Subject<void>();
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
            const index = type.indexPattern ?? MAIN_SAVED_OBJECT_INDEX;
            return acc.add(index);
          }, new Set<string>())
          .values()
      ).map(async (index) => {
        // Use indices stats instead of CAT since this data is consumed by telemetry.
        // We make one request per alias/index-pattern and rely on `_all` to aggregate
        // matching concrete indices while preserving the alias identifier we report.
        const indexStatsResults = await elasticsearch.client.asInternalUser.indices
          .stats({
            index,
            metric: ['docs', 'store'],
            filter_path: [
              '_all.primaries.docs.count',
              '_all.primaries.docs.deleted',
              '_all.total.store.size_in_bytes',
              '_all.primaries.store.size_in_bytes',
            ],
          })
          .then((body) => {
            const stats = body._all;

            return {
              alias: index,
              docsCount: stats?.primaries?.docs?.count ?? 0,
              docsDeleted: stats?.primaries?.docs?.deleted ?? 0,
              storeSizeBytes: stats?.total?.store?.size_in_bytes ?? 0,
              primaryStoreSizeBytes: stats?.primaries?.store?.size_in_bytes ?? 0,
            };
          });
        // We use the GET <index>/_count API to get the number of saved objects
        // to monitor if the cluster will hit the scalling limit of saved object migrations
        const savedObjectsCounts = await elasticsearch.client.asInternalUser
          .count({
            index,
          })
          .then((body) => {
            return {
              savedObjectsDocsCount: body.count ? body.count : 0,
            };
          });
        this.logger.debug(
          `Lucene documents count ${indexStatsResults.docsCount} from index ${indexStatsResults.alias}`
        );
        this.logger.debug(
          `Saved objects documents count ${savedObjectsCounts.savedObjectsDocsCount} from index ${indexStatsResults.alias}`
        );
        return {
          ...indexStatsResults,
          ...savedObjectsCounts,
        };
      })
    );
  }

  private async getSavedObjectAliasUsageData(elasticsearch: ElasticsearchServiceStart) {
    // Note: this agg can be changed to use `savedObjectsRepository.find` in the future after `filters` is supported.
    // See src/core/server/saved_objects/service/lib/aggregations/aggs_types/bucket_aggs.ts for supported aggregations.
    const resp = await elasticsearch.client.asInternalUser.search<
      unknown,
      { aliases: UsageDataAggs }
    >({
      index: MAIN_SAVED_OBJECT_INDEX, // depends on the .kibana split (assuming 'legacy-url-alias' is stored in '.kibana')
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
    });

    const { hits, aggregations } = resp;
    const totalCount = (hits.total as SearchTotalHits).value;
    const aggregate = aggregations!.aliases;
    const buckets = aggregate.buckets;
    const disabledCount = buckets.disabled.doc_count;
    const activeCount = buckets.active.doc_count;
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
          requestHeadersWhitelistConfigured: isConfigured.stringOrArray(
            es.requestHeadersWhitelist,
            ['authorization', 'es-client-authentication']
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
          protocol: http.protocol,
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
            crossOriginOpenerPolicy: http.securityResponseHeaders.crossOriginOpenerPolicy ?? 'NULL',
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
          customIndex: false,
          maxImportPayloadBytes: this.soConfig.maxImportPayloadBytes.getValueInBytes(),
          maxImportExportSize: this.soConfig.maxImportExportSize,
        },

        deprecatedKeys: this.deprecatedConfigPaths,
      },
      environment: {
        memory: {
          arrayBuffersBytes: this.opsMetrics.process.memory.array_buffers_in_bytes,
          residentSetSizeBytes: this.opsMetrics.process.memory.resident_set_size_in_bytes,
          externalBytes: this.opsMetrics.process.memory.external_in_bytes,
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
    const config = await firstValueFrom(this.configService.getConfig$());
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

    changedDeprecatedConfigPath$
      .pipe(takeUntil(this.stop$))
      .subscribe((deprecatedConfigPaths) => (this.deprecatedConfigPaths = deprecatedConfigPaths));

    const internalRepositoryPromise = savedObjectsStartPromise.then((savedObjects) =>
      savedObjects.createInternalRepository([CORE_USAGE_STATS_TYPE])
    );

    const registerType = (typeRegistry: SavedObjectTypeRegistry) => {
      typeRegistry.registerType(coreUsageStatsType);
    };

    const registerUsageCounter = (usageCounter: CoreUsageCounter) => {
      this.incrementUsageCounter = (params) => usageCounter.incrementCounter(params);
    };

    const incrementUsageCounter = (params: CoreIncrementCounterParams) => {
      try {
        this.incrementUsageCounter(params);
      } catch (e) {
        // Self-defense mechanism since the handler is externally registered
        this.logger.debug('Failed to increase the usage counter');
        this.logger.debug(e);
      }
    };

    const registerDeprecatedUsageFetch = (fetchFn: DeprecatedApiUsageFetcher) => {
      this.deprecatedApiUsageFetcher = fetchFn;
    };

    const fetchDeprecatedUsageStats = (params: { soClient: ISavedObjectsRepository }) => {
      return this.deprecatedApiUsageFetcher(params);
    };

    this.coreUsageStatsClient = new CoreUsageStatsClient({
      debugLogger: (message: string) => this.logger.debug(message),
      basePath: http.basePath,
      repositoryPromise: internalRepositoryPromise,
      stop$: this.stop$,
      incrementUsageCounter,
      fetchDeprecatedUsageStats,
    });

    const contract: InternalCoreUsageDataSetup = {
      registerType,
      getClient: () => this.coreUsageStatsClient!,
      registerUsageCounter,
      incrementUsageCounter,
      registerDeprecatedUsageFetch,
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
