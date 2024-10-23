/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withTimeout } from '@kbn/std';
import { snakeCase } from 'lodash';

import type {
  Logger,
  ElasticsearchClient,
  SavedObjectsClientContract,
  KibanaExecutionContext,
  ExecutionContextSetup,
} from '@kbn/core/server';
import { Collector } from './collector';
import type { ICollector, CollectorOptions, CollectorFetchContext, ICollectorSet } from './types';
import { UsageCollector, type UsageCollectorOptions } from './usage_collector';
import { DEFAULT_MAXIMUM_WAIT_TIME_FOR_ALL_COLLECTORS_IN_S } from '../../common/constants';
import { createPerformanceObsHook, perfTimerify } from './measure_duration';
import { usageCollectorsStatsCollector } from './collector_stats';

const SECOND_IN_MS = 1000;
// Needed for the general array containing all the collectors. We don't really care about their types here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCollector = ICollector<any, any>;
interface CollectorWithStatus {
  isReadyWithTimeout: Awaited<ReturnType<typeof withTimeout>>;
  collector: AnyCollector;
}

interface FetchCollectorOutput {
  result?: unknown;
  status: 'failed' | 'success';
  type: string;
}

export interface CollectorSetConfig {
  logger: Logger;
  executionContext: ExecutionContextSetup;
  maximumWaitTimeForAllCollectorsInS?: number;
  collectors?: AnyCollector[];
}

export class CollectorSet implements ICollectorSet {
  private readonly logger: Logger;
  private readonly executionContext: ExecutionContextSetup;
  private readonly maximumWaitTimeForAllCollectorsInS: number;
  private readonly collectors: Map<string, AnyCollector>;
  private readonly fetchingCollectors = new WeakMap<AnyCollector, Promise<FetchCollectorOutput>>();
  constructor({
    logger,
    executionContext,
    maximumWaitTimeForAllCollectorsInS = DEFAULT_MAXIMUM_WAIT_TIME_FOR_ALL_COLLECTORS_IN_S,
    collectors = [],
  }: CollectorSetConfig) {
    this.logger = logger;
    this.executionContext = executionContext;
    this.collectors = new Map(collectors.map((collector) => [collector.type, collector]));
    this.maximumWaitTimeForAllCollectorsInS = maximumWaitTimeForAllCollectorsInS;
  }

  /**
   * Instantiates a stats collector with the definition provided in the options
   * @param options Definition of the collector {@link CollectorOptions}
   */
  public makeStatsCollector = <TFetchReturn, ExtraOptions extends object = {}>(
    options: CollectorOptions<TFetchReturn, ExtraOptions>
  ) => {
    return new Collector<TFetchReturn, ExtraOptions>(this.logger, options);
  };

  /**
   * Instantiates an usage collector with the definition provided in the options
   * @param options Definition of the collector {@link CollectorOptions}
   */
  public makeUsageCollector = <TFetchReturn, ExtraOptions extends object = {}>(
    options: UsageCollectorOptions<TFetchReturn, ExtraOptions>
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
  };

  public getCollectorByType = (type: string) => {
    return [...this.collectors.values()].find((c) => c.type === type);
  };

  private getReadyCollectors = async (
    collectors: Map<string, AnyCollector> = this.collectors
  ): Promise<{
    readyCollectors: AnyCollector[];
    nonReadyCollectorTypes: string[];
    timedOutCollectorsTypes: string[];
  }> => {
    if (!(collectors instanceof Map)) {
      throw new Error(
        `getReadyCollectors method given bad Map of collectors: ` + typeof collectors
      );
    }

    const timeoutMs = this.maximumWaitTimeForAllCollectorsInS * SECOND_IN_MS;
    const collectorsWithStatus: CollectorWithStatus[] = await Promise.all(
      [...collectors.values()].map(async (collector) => {
        const wrappedPromise = perfTimerify(
          `is_ready_${collector.type}`,
          async (): Promise<boolean> => {
            try {
              return await collector.isReady();
            } catch (err) {
              this.logger.debug(`Collector ${collector.type} failed to get ready. ${err}`);
              return false;
            }
          }
        );

        const isReadyWithTimeout = await withTimeout<boolean>({
          promise: wrappedPromise(),
          timeoutMs,
        });

        if (isReadyWithTimeout.timedout) {
          return { isReadyWithTimeout, collector };
        }

        return {
          isReadyWithTimeout: {
            value: isReadyWithTimeout.value,
            timedout: isReadyWithTimeout.timedout,
          },
          collector,
        };
      })
    );

    const timedOutCollectorsTypes = collectorsWithStatus
      .filter((collectorWithStatus) => collectorWithStatus.isReadyWithTimeout.timedout)
      .map(({ collector }) => collector.type);

    if (timedOutCollectorsTypes.length) {
      this.logger.debug(
        `Some collectors timedout getting ready (${timedOutCollectorsTypes.join(', ')}). ` +
          `Waited for ${this.maximumWaitTimeForAllCollectorsInS}s and will return data from collectors that are ready.`
      );
    }

    const nonTimedOutCollectors = collectorsWithStatus.filter(
      (
        collectorWithStatus
      ): collectorWithStatus is {
        isReadyWithTimeout: { timedout: false; value: boolean };
        collector: AnyCollector;
      } => collectorWithStatus.isReadyWithTimeout.timedout === false
    );

    const collectorsTypesNotReady = nonTimedOutCollectors
      .filter(({ isReadyWithTimeout }) => isReadyWithTimeout.value === false)
      .map(({ collector }) => collector.type);

    if (collectorsTypesNotReady.length) {
      this.logger.debug(
        `Some collectors are not ready (${collectorsTypesNotReady.join(',')}). ` +
          `will return data from all collectors that are ready.`
      );
    }

    const readyCollectors = nonTimedOutCollectors
      .filter(({ isReadyWithTimeout }) => isReadyWithTimeout.value === true)
      .map(({ collector }) => collector);

    return {
      readyCollectors,
      nonReadyCollectorTypes: collectorsTypesNotReady,
      timedOutCollectorsTypes,
    };
  };

  private fetchCollector = async (
    collector: AnyCollector,
    context: CollectorFetchContext
  ): Promise<FetchCollectorOutput> => {
    const { type } = collector;
    this.logger.debug(`Fetching data from ${type} collector`);
    const executionContext: KibanaExecutionContext = {
      type: 'usage_collection',
      name: 'collector.fetch',
      id: type,
      description: `Fetch method in the Collector "${type}"`,
    };

    try {
      const result = await this.executionContext.withContext(executionContext, () =>
        collector.fetch(context)
      );
      return { type, result, status: 'success' as const };
    } catch (err) {
      this.logger.warn(err);
      this.logger.warn(`Unable to fetch data from ${type} collector`);
      return { type, status: 'failed' as const };
    }
  };

  public bulkFetch = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    collectors: Map<string, AnyCollector> = this.collectors
  ) => {
    this.logger.debug(`Getting ready collectors`);
    const getMarks = createPerformanceObsHook();
    const { readyCollectors, nonReadyCollectorTypes, timedOutCollectorsTypes } =
      await this.getReadyCollectors(collectors);

    // freeze object to prevent collectors from mutating it.
    const context = Object.freeze({ esClient, soClient });

    const fetchExecutions = await Promise.all(
      readyCollectors.map(async (collector) => {
        // If the collector is processing from a concurrent request, reuse it.
        let wrappedPromise = this.fetchingCollectors.get(collector);

        if (!wrappedPromise) {
          // Otherwise, call it
          wrappedPromise = perfTimerify(
            `fetch_${collector.type}`,
            async () => await this.fetchCollector(collector, context)
          )();
        }

        this.fetchingCollectors.set(collector, wrappedPromise);

        wrappedPromise.finally(() => this.fetchingCollectors.delete(collector));

        return await wrappedPromise;
      })
    );
    const durationMarks = getMarks();

    const isReadyExecutionDurationByType = [
      ...readyCollectors.map(({ type }) => {
        // should always find a duration, fallback to 0 in case something unexpected happened
        const duration = durationMarks[`is_ready_${type}`] || 0;
        return { duration, type };
      }),
      ...nonReadyCollectorTypes.map((type) => {
        // should always find a duration, fallback to 0 in case something unexpected happened
        const duration = durationMarks[`is_ready_${type}`] || 0;
        return { duration, type };
      }),
      ...timedOutCollectorsTypes.map((type) => {
        const timeoutMs = this.maximumWaitTimeForAllCollectorsInS * SECOND_IN_MS;
        // if undefined default to timeoutMs since the collector timedout
        const duration = durationMarks[`is_ready_${type}`] || timeoutMs;
        return { duration, type };
      }),
    ];

    const fetchExecutionDurationByType = fetchExecutions.map(({ type, status }) => {
      // should always find a duration, fallback to 0 in case something unexpected happened
      const duration = durationMarks[`fetch_${type}`] || 0;
      return { duration, type, status };
    });

    const usageCollectorStats = usageCollectorsStatsCollector(
      // pass `this` as `usageCollection` to the collector to mimic
      // registering a collector via usageCollection.SetupContract
      this,
      {
        // isReady stats
        nonReadyCollectorTypes,
        timedOutCollectorsTypes,
        isReadyExecutionDurationByType,

        // fetch stats
        fetchExecutionDurationByType,
      }
    );

    return [
      ...fetchExecutions
        // pluck type and result from collector object
        .map(({ type, result }) => ({ type, result }))
        // only keep data of collectors thar returned a result
        .filter(
          (response): response is { type: string; result: unknown } =>
            typeof response?.result !== 'undefined'
        ),

      // Treat collector stats as just another "collector"
      { type: usageCollectorStats.type, result: usageCollectorStats.fetch(context) },
    ];
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
    savedObjectsClient: SavedObjectsClientContract
  ) => {
    const usageCollectors = this.getFilteredCollectorSet((c) => c instanceof UsageCollector);
    return await this.bulkFetch(esClient, savedObjectsClient, usageCollectors.collectors);
  };

  /**
   * Convert an array of fetched stats results into key/object
   * @param statsData Array of fetched stats results
   */
  public toObject = <Result extends Record<string, unknown>, T = unknown>(
    statsData: Array<{ type: string; result: T }> = []
  ): Result => {
    return Object.fromEntries(statsData.map(({ type, result }) => [type, result])) as Result;
  };

  /**
   * Rename fields to use API conventions
   * @param apiData Data to be normalized
   */
  public toApiFieldNames = (
    apiData: Record<string, unknown> | unknown[]
  ): Record<string, unknown> | unknown[] => {
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
  };

  private getValueOrRecurse = (value: unknown) => {
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      return this.toApiFieldNames(value as Record<string, unknown> | unknown[]); // recurse
    }
    return value;
  };

  private makeCollectorSetFromArray = (collectors: AnyCollector[]) => {
    return new CollectorSet({
      logger: this.logger,
      executionContext: this.executionContext,
      maximumWaitTimeForAllCollectorsInS: this.maximumWaitTimeForAllCollectorsInS,
      collectors,
    });
  };
}
