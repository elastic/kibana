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

import { TELEMETRY_STATS_TYPE } from '../../../common/constants';
import { getTelemetrySavedObject } from '../../telemetry_repository';
export interface TelemetryUsageStats {
  optIn?: boolean | null;
  usageFetcher?: 'browser' | 'server';
  lastReported?: number;
}

export function createCollectorFetch(server: any) {
  return async function fetchUsageStats(): Promise<TelemetryUsageStats> {
    const { getSavedObjectsRepository } = server.savedObjects;
    const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);
    const telemetrySavedObject = await getTelemetrySavedObject(internalRepository);

    if (!telemetrySavedObject) return {};

    return {
      optIn: telemetrySavedObject.enabled,
      lastReported: telemetrySavedObject.lastReported,
      usageFetcher: telemetrySavedObject.usageFetcher,
    };
  };
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function createTelemetryPluginUsageCollector(server: any) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: TELEMETRY_STATS_TYPE,
    isReady: () => true,
    fetch: createCollectorFetch(server),
  });
}
