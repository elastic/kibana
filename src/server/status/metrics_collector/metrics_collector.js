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

import { Metrics } from './metrics';

const matchSnapshot = /-SNAPSHOT$/;

/*
 * Persist operational data for machine reading
 * sets the latest guage values
 * sums the latest accumulative values
 */
export class MetricsCollector {
  constructor(server, config) {

    // NOTE we need access to config every time this is used because uuid is managed by the kibana core_plugin, which is initialized AFTER kbn_server
    this._getBaseStats = () => ({
      name: config.get('server.name'),
      uuid: config.get('server.uuid'),
      version: {
        number: config.get('pkg.version').replace(matchSnapshot, ''),
        build_hash: config.get('pkg.buildSha'),
        build_number: config.get('pkg.buildNum'),
        build_snapshot: matchSnapshot.test(config.get('pkg.version'))
      }
    });

    this._stats = Metrics.getStubMetrics();
    this._metrics = new Metrics(config, server); // TODO: deprecate status API that uses Metrics class, move it this module, fix the order of its constructor params
  }

  /*
   * Accumulate metrics by summing values in an accumulutor object with the next values
   *
   * @param {String} property The property of the objects to roll up
   * @param {Object} accum The accumulator object
   * @param {Object} next The object containing next values
   */
  static sumAccumulate(property, accum, next) {
    const accumValue = accum[property];
    const nextValue = next[property];

    if (nextValue === null || nextValue === undefined) {
      return; // do not accumulate null/undefined since it can't be part of a sum
    } else if (nextValue.constructor === Object) { // nested structure, object
      const newProps = {};
      for (const innerKey in nextValue) {
        if (nextValue.hasOwnProperty(innerKey)) {
          const tempAccumValue = accumValue || {};
          newProps[innerKey] = MetricsCollector.sumAccumulate(innerKey, tempAccumValue, nextValue);
        }
      }
      return { // merge the newly summed nested values
        ...accumValue,
        ...newProps,
      };
    } else if (nextValue.constructor === Number) {
      // leaf value
      if (nextValue || nextValue === 0) {
        const tempAccumValue = accumValue || 0; // treat null / undefined as 0
        const tempNextValue = nextValue || 0;
        return tempAccumValue + tempNextValue; // perform sum
      }
    } else {
      return; // drop unknown type
    }
  }

  async collect(event) {
    const capturedEvent = await this._metrics.capture(event); // wait for cgroup measurement
    const { process, os, ...metrics } = capturedEvent;

    const stats = {
      // guage values
      ...metrics,
      process,
      os,

      // accumulative counters
      response_times: MetricsCollector.sumAccumulate('response_times', this._stats, metrics),
      requests: MetricsCollector.sumAccumulate('requests', this._stats, metrics),
      concurrent_connections: MetricsCollector.sumAccumulate('concurrent_connections', this._stats, metrics),
      sockets: MetricsCollector.sumAccumulate('sockets', this._stats, metrics),
      event_loop_delay: MetricsCollector.sumAccumulate('event_loop_delay', this._stats, metrics),
    };

    this._stats = stats;
    return stats;
  }

  getStats() {
    return {
      ...this._getBaseStats(),
      ...this._stats
    };
  }
}
