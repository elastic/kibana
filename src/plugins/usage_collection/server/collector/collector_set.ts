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

import { snakeCase } from 'lodash';
import { Logger } from 'kibana/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
// @ts-ignore
import { Collector } from './collector';
// @ts-ignore
import { UsageCollector } from './usage_collector';

interface CollectorSetConfig {
  logger: Logger;
  maximumWaitTimeForAllCollectorsInS: number;
  collectors?: Collector[];
}

export class CollectorSet {
  private _waitingForAllCollectorsTimestamp?: number;
  private logger: Logger;
  private readonly maximumWaitTimeForAllCollectorsInS: number;
  private collectors: Collector[] = [];
  constructor({ logger, maximumWaitTimeForAllCollectorsInS, collectors = [] }: CollectorSetConfig) {
    this.logger = logger;
    this.collectors = collectors;
    this.maximumWaitTimeForAllCollectorsInS = maximumWaitTimeForAllCollectorsInS || 60;
  }

  public makeStatsCollector = (options: any) => {
    return new Collector(this.logger, options);
  };
  public makeUsageCollector = (options: any) => {
    return new UsageCollector(this.logger, options);
  };

  /*
   * @param collector {Collector} collector object
   */
  public registerCollector = (collector: Collector) => {
    // check instanceof
    if (!(collector instanceof Collector)) {
      throw new Error('CollectorSet can only have Collector instances registered');
    }

    this.collectors.push(collector);

    if (collector.init) {
      this.logger.debug(`Initializing ${collector.type} collector`);
      collector.init();
    }
  };

  public getCollectorByType = (type: string) => {
    return this.collectors.find(c => c.type === type);
  };

  public isUsageCollector = (x: UsageCollector | any): x is UsageCollector => {
    return x instanceof UsageCollector;
  };

  public areAllCollectorsReady = async (collectorSet = this) => {
    if (!(collectorSet instanceof CollectorSet)) {
      throw new Error(
        `areAllCollectorsReady method given bad collectorSet parameter: ` + typeof collectorSet
      );
    }

    const collectorTypesNotReady: string[] = [];
    let allReady = true;
    for (const collector of collectorSet.collectors) {
      if (!(await collector.isReady())) {
        allReady = false;
        collectorTypesNotReady.push(collector.type);
      }
    }

    if (!allReady && this.maximumWaitTimeForAllCollectorsInS >= 0) {
      const nowTimestamp = +new Date();
      this._waitingForAllCollectorsTimestamp =
        this._waitingForAllCollectorsTimestamp || nowTimestamp;
      const timeWaitedInMS = nowTimestamp - this._waitingForAllCollectorsTimestamp;
      const timeLeftInMS = this.maximumWaitTimeForAllCollectorsInS * 1000 - timeWaitedInMS;
      if (timeLeftInMS <= 0) {
        this.logger.debug(
          `All collectors are not ready (waiting for ${collectorTypesNotReady.join(',')}) ` +
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
    callCluster: CallCluster,
    collectors: Collector[] = this.collectors
  ) => {
    const responses = [];
    for (const collector of collectors) {
      this.logger.debug(`Fetching data from ${collector.type} collector`);
      try {
        responses.push({
          type: collector.type,
          result: await collector.fetchInternal(callCluster),
        });
      } catch (err) {
        this.logger.warn(err);
        this.logger.warn(`Unable to fetch data from ${collector.type} collector`);
      }
    }

    return responses;
  };

  /*
   * @return {new CollectorSet}
   */
  public getFilteredCollectorSet = (filter: any) => {
    const filtered = this.collectors.filter(filter);
    return this.makeCollectorSetFromArray(filtered);
  };

  public bulkFetchUsage = async (callCluster: CallCluster) => {
    const usageCollectors = this.getFilteredCollectorSet((c: any) => c instanceof UsageCollector);
    return await this.bulkFetch(callCluster, usageCollectors.collectors);
  };

  // convert an array of fetched stats results into key/object
  public toObject = (statsData: any) => {
    if (!statsData) return {};
    return statsData.reduce((accumulatedStats: any, { type, result }: any) => {
      return {
        ...accumulatedStats,
        [type]: result,
      };
    }, {});
  };

  // rename fields to use api conventions
  public toApiFieldNames = (apiData: any): any => {
    const getValueOrRecurse = (value: any) => {
      if (value == null || typeof value !== 'object') {
        return value;
      } else {
        return this.toApiFieldNames(value); // recurse
      }
    };

    // handle array and return early, or return a reduced object

    if (Array.isArray(apiData)) {
      return apiData.map(getValueOrRecurse);
    }

    return Object.keys(apiData).reduce((accum, field) => {
      const value = apiData[field];
      let newName = field;
      newName = snakeCase(newName);
      newName = newName.replace(/^(1|5|15)_m/, '$1m'); // os.load.15m, os.load.5m, os.load.1m
      newName = newName.replace('_in_bytes', '_bytes');
      newName = newName.replace('_in_millis', '_ms');

      return {
        ...accum,
        [newName]: getValueOrRecurse(value),
      };
    }, {});
  };

  // TODO: remove
  public map = (mapFn: any) => {
    return this.collectors.map(mapFn);
  };

  // TODO: remove
  public some = (someFn: any) => {
    return this.collectors.some(someFn);
  };

  private makeCollectorSetFromArray = (collectors: Collector[]) => {
    return new CollectorSet({
      logger: this.logger,
      maximumWaitTimeForAllCollectorsInS: this.maximumWaitTimeForAllCollectorsInS,
      collectors,
    });
  };
}
