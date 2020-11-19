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

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { ISavedObjectsRepository, SavedObjectsClient } from '../../../../../core/server';
import { getTelemetrySavedObject, TelemetrySavedObject } from '../../telemetry_repository';
import { getTelemetryOptIn, getTelemetrySendUsageFrom } from '../../../common/telemetry_config';
import { UsageCollectionSetup } from '../../../../usage_collection/server';
import { TelemetryConfigType } from '../../config';

export interface TelemetryUsageStats {
  opt_in_status?: boolean | null;
  usage_fetcher?: 'browser' | 'server';
  last_reported?: number;
}

export interface TelemetryPluginUsageCollectorOptions {
  currentKibanaVersion: string;
  config$: Observable<TelemetryConfigType>;
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined;
}

export function createCollectorFetch({
  currentKibanaVersion,
  config$,
  getSavedObjectsClient,
}: TelemetryPluginUsageCollectorOptions) {
  return async function fetchUsageStats(): Promise<TelemetryUsageStats> {
    const { sendUsageFrom, allowChangingOptInStatus, optIn = null } = await config$
      .pipe(take(1))
      .toPromise();
    const configTelemetrySendUsageFrom = sendUsageFrom;
    const configTelemetryOptIn = optIn;

    let telemetrySavedObject: TelemetrySavedObject = {};

    try {
      const internalRepository = getSavedObjectsClient()!;
      telemetrySavedObject = await getTelemetrySavedObject(
        new SavedObjectsClient(internalRepository)
      );
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
  options: TelemetryPluginUsageCollectorOptions
) {
  const collector = usageCollection.makeUsageCollector<TelemetryUsageStats>({
    type: 'telemetry',
    isReady: () => typeof options.getSavedObjectsClient() !== 'undefined',
    fetch: createCollectorFetch(options),
    schema: {
      opt_in_status: { type: 'boolean' },
      usage_fetcher: { type: 'keyword' },
      last_reported: { type: 'long' },
    },
  });

  usageCollection.registerCollector(collector);
}
