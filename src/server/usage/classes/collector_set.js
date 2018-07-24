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
import Promise from 'bluebird';
import { getCollectorLogger } from '../lib';
import { Collector } from './collector';
import { UsageCollector } from './usage_collector';

/*
 * A collector object has types registered into it with the register(type)
 * function. Each type that gets registered defines how to fetch its own data
 * and combine it into a unified payload for bulk upload.
 */
export class CollectorSet {

  /*
   * @param {Object} server - server object
   * @param {Number} options.interval - in milliseconds
   * @param {Function} options.combineTypes
   * @param {Function} options.onPayload
   */
  constructor(server) {
    this._log = getCollectorLogger(server);
    this._collectors = [];

    /*
     * Helper Factory methods
     * Define as instance properties to allow enclosing the server object
     */
    this.makeStatsCollector = options => new Collector(server, options);
    this.makeUsageCollector = options => new UsageCollector(server, options);
  }

  /*
   * @param collector {Collector} collector object
   */
  register(collector) {
    // check instanceof
    if (!(collector instanceof Collector)) {
      throw new Error('CollectorSet can only have Collector instances registered');
    }

    this._collectors.push(collector);

    if (collector.init) {
      this._log.debug(`Initializing ${collector.type} collector`);
      collector.init();
    }
  }

  getCollectorByType(type) {
    return this._collectors.find(c => c.type === type);
  }

  /*
   * Call a bunch of fetch methods and then do them in bulk
   * @param {Array} collectors - an array of collectors, default to all registered collectors
   */
  bulkFetch(callCluster, collectors = this._collectors) {
    if (!Array.isArray(collectors)) {
      throw new Error(`bulkFetch method given bad collectors parameter: ` + typeof collectors);
    }

    return Promise.map(collectors, collector => {
      const collectorType = collector.type;
      this._log.debug(`Fetching data from ${collectorType} collector`);
      return Promise.props({
        type: collectorType,
        result: collector.fetchInternal(callCluster) // use the wrapper for fetch, kicks in error checking
      })
        .catch(err => {
          this._log.warn(err);
          this._log.warn(`Unable to fetch data from ${collectorType} collector`);
        });
    });
  }

  async bulkFetchUsage(callCluster) {
    const usageCollectors = this._collectors.filter(c => c instanceof UsageCollector);
    return this.bulkFetch(callCluster, usageCollectors);
  }

  // convert an array of fetched stats results into key/object
  toObject(statsData) {
    return statsData.reduce((accumulatedStats, { type, result }) => {
      return {
        ...accumulatedStats,
        [type]: result,
      };
    }, {});
  }

  // rename fields to use api conventions
  toApiFieldNames(apiData) {
    const getValueOrRecurse = value => {
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
  }
}
