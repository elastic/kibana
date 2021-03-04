/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { snakeCase } from 'lodash';
import {
  Logger,
  ElasticsearchClient,
  ISavedObjectsRepository,
  SavedObjectsClientContract,
  KibanaRequest,
} from 'src/core/server';
import { Collector, CollectorOptions } from './collector';
import { UsageCollector, UsageCollectorOptions } from './usage_collector';

type AnyCollector = Collector<any, any>;

interface CollectorSetConfig {
  logger: Logger;
  maximumWaitTimeForAllCollectorsInS?: number;
  collectors?: AnyCollector[];
}

/**
 * Public interface of the CollectorSet (makes it easier to mock only the public methods)
 */
export type CollectorSetPublic = Pick<
  CollectorSet,
  | 'makeStatsCollector'
  | 'makeUsageCollector'
  | 'registerCollector'
  | 'getCollectorByType'
  | 'areAllCollectorsReady'
  | 'bulkFetch'
  | 'bulkFetchUsage'
  | 'toObject'
  | 'toApiFieldNames'
>;

export class CollectorSet {
  private _waitingForAllCollectorsTimestamp?: number;
  private readonly logger: Logger;
  private readonly maximumWaitTimeForAllCollectorsInS: number;
  private readonly collectors: Map<string, AnyCollector>;
  constructor({ logger, maximumWaitTimeForAllCollectorsInS, collectors = [] }: CollectorSetConfig) {
    this.logger = logger;
    this.collectors = new Map(collectors.map((collector) => [collector.type, collector]));
    this.maximumWaitTimeForAllCollectorsInS = maximumWaitTimeForAllCollectorsInS || 60;
  }

  /**
   * Instantiates a stats collector with the definition provided in the options
   * @param options Definition of the collector {@link CollectorOptions}
   */
  public makeStatsCollector = <
    TFetchReturn,
    WithKibanaRequest extends boolean,
    ExtraOptions extends object = {}
  >(
    options: CollectorOptions<TFetchReturn, WithKibanaRequest, ExtraOptions>
  ) => {
    return new Collector<TFetchReturn, ExtraOptions>(this.logger, options);
  };

  /**
   * Instantiates an usage collector with the definition provided in the options
   * @param options Definition of the collector {@link CollectorOptions}
   */
  public makeUsageCollector = <
    TFetchReturn,
    // TODO: Right now, users will need to explicitly claim `true` for TS to allow `kibanaRequest` usage.
    //  If we improve `telemetry-check-tools` so plugins do not need to specify TFetchReturn,
    //  we'll be able to remove the type defaults and TS will successfully infer the config value as provided in JS.
    WithKibanaRequest extends boolean = false,
    ExtraOptions extends object = {}
  >(
    options: UsageCollectorOptions<TFetchReturn, WithKibanaRequest, ExtraOptions>
  ) => {
    return new UsageCollector<TFetchReturn, ExtraOptions>(this.logger, options);
  };

  /**
   * Registers a collector to be used when collecting all the usage and stats data
   * @param collector Collector to be added to the set (previously created via `makeUsageCollector` or `makeStatsCollector`)
   */
  public registerCollector = <TFetchReturn, ExtraOptions extends object>(
    collector: Collector<TFetchReturn, ExtraOptions>
  ) => {
    // check instanceof
    if (!(collector instanceof Collector)) {
      throw new Error('CollectorSet can only have Collector instances registered');
    }

    if (this.collectors.get(collector.type)) {
      throw new Error(`Usage collector's type "${collector.type}" is duplicated.`);
    }

    this.collectors.set(collector.type, collector);

    if (collector.init) {
      this.logger.debug(`Initializing ${collector.type} collector`);
      collector.init();
    }
  };

  public getCollectorByType = (type: string) => {
    return [...this.collectors.values()].find((c) => c.type === type);
  };

  public areAllCollectorsReady = async (collectorSet: CollectorSet = this) => {
    if (!(collectorSet instanceof CollectorSet)) {
      throw new Error(
        `areAllCollectorsReady method given bad collectorSet parameter: ` + typeof collectorSet
      );
    }

    const collectors = [...collectorSet.collectors.values()];
    const collectorsWithStatus = await Promise.all(
      collectors.map(async (collector) => {
        return {
          isReady: await collector.isReady(),
          collector,
        };
      })
    );

    const collectorsTypesNotReady = collectorsWithStatus
      .filter((collectorWithStatus) => collectorWithStatus.isReady === false)
      .map((collectorWithStatus) => collectorWithStatus.collector.type);

    const allReady = collectorsTypesNotReady.length === 0;

    if (!allReady && this.maximumWaitTimeForAllCollectorsInS >= 0) {
      const nowTimestamp = +new Date();
      this._waitingForAllCollectorsTimestamp =
        this._waitingForAllCollectorsTimestamp || nowTimestamp;
      const timeWaitedInMS = nowTimestamp - this._waitingForAllCollectorsTimestamp;
      const timeLeftInMS = this.maximumWaitTimeForAllCollectorsInS * 1000 - timeWaitedInMS;
      if (timeLeftInMS <= 0) {
        this.logger.debug(
          `All collectors are not ready (waiting for ${collectorsTypesNotReady.join(',')}) ` +
            `but we have waited the required ` +
            `${this.maximumWaitTimeForAllCollectorsInS}s and will return data from all collectors that are ready.`
        );

        return true;
      } else {
        this.logger.debug(`All collectors are not ready. Waiting for ${timeLeftInMS}ms longer.`);
      }
    } else {
      this._waitingForAllCollectorsTimestamp = undefined;
    }

    return allReady;
  };

  public bulkFetch = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract | ISavedObjectsRepository,
    kibanaRequest: KibanaRequest | undefined, // intentionally `| undefined` to enforce providing the parameter
    collectors: Map<string, AnyCollector> = this.collectors
  ) => {
    const responses = await Promise.all(
      [...collectors.values()].map(async (collector) => {
        this.logger.debug(`Fetching data from ${collector.type} collector`);
        try {
          const context = {
            esClient,
            soClient,
            ...(collector.extendFetchContext.kibanaRequest && { kibanaRequest }),
          };
          return {
            type: collector.type,
            result: await collector.fetch(context),
          };
        } catch (err) {
          this.logger.warn(err);
          this.logger.warn(`Unable to fetch data from ${collector.type} collector`);
        }
      })
    );

    return responses.filter(
      (response): response is { type: string; result: unknown } => typeof response !== 'undefined'
    );
  };

  /*
   * @return {new CollectorSet}
   */
  private getFilteredCollectorSet = (filter: (col: AnyCollector) => boolean) => {
    const filtered = [...this.collectors.values()].filter(filter);
    return this.makeCollectorSetFromArray(filtered);
  };

  public bulkFetchUsage = async (
    esClient: ElasticsearchClient,
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository,
    kibanaRequest: KibanaRequest | undefined // intentionally `| undefined` to enforce providing the parameter
  ) => {
    const usageCollectors = this.getFilteredCollectorSet((c) => c instanceof UsageCollector);
    return await this.bulkFetch(
      esClient,
      savedObjectsClient,
      kibanaRequest,
      usageCollectors.collectors
    );
  };

  /**
   * Convert an array of fetched stats results into key/object
   * @param statsData Array of fetched stats results
   */
  public toObject<Result extends Record<string, unknown>, T = unknown>(
    statsData: Array<{ type: string; result: T }> = []
  ): Result {
    return Object.fromEntries(statsData.map(({ type, result }) => [type, result])) as Result;
  }

  /**
   * Rename fields to use API conventions
   * @param apiData Data to be normalized
   */
  public toApiFieldNames(
    apiData: Record<string, unknown> | unknown[]
  ): Record<string, unknown> | unknown[] {
    // handle array and return early, or return a reduced object
    if (Array.isArray(apiData)) {
      return apiData.map((value) => this.getValueOrRecurse(value));
    }

    return Object.fromEntries(
      Object.entries(apiData).map(([field, value]) => {
        let newName = field;
        newName = snakeCase(newName);
        newName = newName.replace(/^(1|5|15)_m/, '$1m'); // os.load.15m, os.load.5m, os.load.1m
        newName = newName.replace('_in_bytes', '_bytes');
        newName = newName.replace('_in_millis', '_ms');

        return [newName, this.getValueOrRecurse(value)];
      })
    );
  }

  private getValueOrRecurse(value: unknown) {
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      return this.toApiFieldNames(value as Record<string, unknown> | unknown[]); // recurse
    }
    return value;
  }

  private makeCollectorSetFromArray = (collectors: AnyCollector[]) => {
    return new CollectorSet({
      logger: this.logger,
      maximumWaitTimeForAllCollectorsInS: this.maximumWaitTimeForAllCollectorsInS,
      collectors,
    });
  };
}
