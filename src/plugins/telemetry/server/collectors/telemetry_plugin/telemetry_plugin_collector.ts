/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, firstValueFrom } from 'rxjs';
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
    const { sendUsageFrom, allowChangingOptInStatus, optIn = null } = await firstValueFrom(config$);
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
