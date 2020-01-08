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
import { getTelemetrySavedObject, TelemetrySavedObject } from '../../telemetry_repository';
import { getTelemetryOptIn, getTelemetrySendUsageFrom } from '../../telemetry_config';
import { UsageCollectionSetup } from '../../../../../../plugins/usage_collection/server';

export interface TelemetryUsageStats {
  opt_in_status?: boolean | null;
  usage_fetcher?: 'browser' | 'server';
  last_reported?: number;
}

export function createCollectorFetch(server: any) {
  return async function fetchUsageStats(): Promise<TelemetryUsageStats> {
    const config = server.config();
    const configTelemetrySendUsageFrom = config.get('telemetry.sendUsageFrom');
    const allowChangingOptInStatus = config.get('telemetry.allowChangingOptInStatus');
    const configTelemetryOptIn = config.get('telemetry.optIn');
    const currentKibanaVersion = config.get('pkg.version');

    let telemetrySavedObject: TelemetrySavedObject = {};

    try {
      const { getSavedObjectsRepository } = server.savedObjects;
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const internalRepository = getSavedObjectsRepository(callWithInternalUser);
      telemetrySavedObject = await getTelemetrySavedObject(internalRepository);
    } catch (err) {
      // no-op
    }

    return {
      opt_in_status: getTelemetryOptIn({
        currentKibanaVersion,
        telemetrySavedObject,
        allowChangingOptInStatus,
        configTelemetryOptIn,
      }),
      last_reported: telemetrySavedObject ? telemetrySavedObject.lastReported : undefined,
      usage_fetcher: getTelemetrySendUsageFrom({
        telemetrySavedObject,
        configTelemetrySendUsageFrom,
      }),
    };
  };
}

export function registerTelemetryPluginUsageCollector(
  usageCollection: UsageCollectionSetup,
  server: any
) {
  const collector = usageCollection.makeUsageCollector({
    type: TELEMETRY_STATS_TYPE,
    isReady: () => true,
    fetch: createCollectorFetch(server),
  });

  usageCollection.registerCollector(collector);
}
