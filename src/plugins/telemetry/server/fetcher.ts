/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  BehaviorSubject,
  exhaustMap,
  filter,
  firstValueFrom,
  merge,
  mergeMap,
  Observable,
  skip,
  Subscription,
  takeUntil,
  timer,
} from 'rxjs';
import fetch from 'node-fetch';
import type { TelemetryCollectionManagerPluginStart } from '@kbn/telemetry-collection-manager-plugin/server';
import {
  type PluginInitializerContext,
  type Logger,
  type SavedObjectsClientContract,
  SavedObjectsClient,
  type CoreStart,
} from '@kbn/core/server';
import { getTelemetryChannelEndpoint } from '../common/telemetry_config';
import {
  TELEMETRY_SAVED_OBJECT_TYPE,
  getTelemetrySavedObject,
  updateTelemetrySavedObject,
} from './saved_objects';
import { getNextAttemptDate } from './get_next_attempt_date';
import {
  getTelemetryOptIn,
  getTelemetrySendUsageFrom,
  getTelemetryFailureDetails,
} from './telemetry_config';
import { PAYLOAD_CONTENT_ENCODING } from '../common/constants';
import type { EncryptedTelemetryPayload } from '../common/types';
import type { TelemetryConfigType } from './config';
import { isReportIntervalExpired } from '../common/is_report_interval_expired';

export interface FetcherTaskDepsStart {
  telemetryCollectionManager: TelemetryCollectionManagerPluginStart;
}

interface TelemetryConfig {
  telemetryOptIn: boolean | null;
  telemetrySendUsageFrom: 'server' | 'browser';
  telemetryUrl: string;
  failureCount: number;
  failureVersion: string | undefined;
  currentVersion: string;
  lastReported: number | undefined;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export class FetcherTask {
  private readonly initialCheckDelayMs = 5 * MINUTE;
  private readonly connectivityCheckIntervalMs = 12 * HOUR;
  private readonly config$: Observable<TelemetryConfigType>;
  private readonly currentKibanaVersion: string;
  private readonly logger: Logger;
  private readonly subscriptions = new Subscription();
  private readonly isOnline$ = new BehaviorSubject<boolean>(false); // Let's initially assume we are not online
  private readonly lastReported$ = new BehaviorSubject<number>(0);
  private internalRepository?: SavedObjectsClientContract;
  private telemetryCollectionManager?: TelemetryCollectionManagerPluginStart;

  constructor(initializerContext: PluginInitializerContext<TelemetryConfigType>) {
    this.config$ = initializerContext.config.create();
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
    this.logger = initializerContext.logger.get('fetcher');
  }

  public start({ savedObjects }: CoreStart, { telemetryCollectionManager }: FetcherTaskDepsStart) {
    this.internalRepository = new SavedObjectsClient(
      savedObjects.createInternalRepository([TELEMETRY_SAVED_OBJECT_TYPE])
    );
    this.telemetryCollectionManager = telemetryCollectionManager;

    this.subscriptions.add(this.validateConnectivity());
    this.subscriptions.add(this.startSendIfDueSubscription());
  }

  public stop() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Periodically validates the connectivity from the server to our remote telemetry URL.
   * OPTIONS is less intrusive as it does not contain any payload and is used here to check if the endpoint is reachable.
   */
  private validateConnectivity(): Subscription {
    return timer(this.initialCheckDelayMs, this.connectivityCheckIntervalMs)
      .pipe(
        // Skip any further processing if already online
        filter(() => !this.isOnline$.value),
        // Fetch current state and configs
        exhaustMap(async () => await this.getCurrentConfigs()),
        // Skip if opted-out, or should only send from the browser
        filter(
          ({ telemetryOptIn, telemetrySendUsageFrom }) =>
            telemetryOptIn === true && telemetrySendUsageFrom === 'server'
        ),
        // Skip if already failed three times for this version
        filter(
          ({ failureCount, failureVersion, currentVersion }) =>
            !(failureCount > 2 && failureVersion === currentVersion)
        ),
        exhaustMap(async ({ telemetryUrl, failureCount }) => {
          try {
            await fetch(telemetryUrl, { method: 'options' });
            this.isOnline$.next(true);
          } catch (err) {
            this.logger.error(`Cannot reach the remote telemetry endpoint ${telemetryUrl}`);
            await this.updateReportFailure({ failureCount });
          }
        })
      )
      .subscribe();
  }

  private startSendIfDueSubscription() {
    return merge(
      // Attempt to send telemetry...
      // ... whenever connectivity changes
      this.isOnline$,
      // ... when lastReported$ has a new value...
      this.lastReported$.pipe(
        filter(Boolean),
        mergeMap((lastReported) =>
          // ... set a timer of 24h from there (+ a random seed to avoid concurrent emissions from multiple Kibana instances).
          // Emitting again every 1 minute after the next attempt date in case we reach a deadlock in further checks (like Kibana is not healthy at the moment of sending).
          timer(getNextAttemptDate(lastReported), MINUTE).pipe(
            // Cancel this observable if lastReported$ emits again
            takeUntil(this.lastReported$.pipe(skip(1)))
          )
        )
      )
    )
      .pipe(
        filter(() => this.isOnline$.value),
        exhaustMap(() => this.sendIfDue())
      )
      .subscribe();
  }

  private async sendIfDue() {
    // Skip this run if Kibana is not in a healthy state to fetch telemetry.
    if (!(await this.telemetryCollectionManager?.shouldGetTelemetry())) {
      return;
    }

    let telemetryConfig: TelemetryConfig | undefined;

    try {
      telemetryConfig = await this.getCurrentConfigs();
    } catch (err) {
      this.logger.warn(`Error getting telemetry configs. (${err})`);
      return;
    }

    if (!telemetryConfig || !this.shouldSendReport(telemetryConfig)) {
      return;
    }

    let clusters: EncryptedTelemetryPayload = [];

    try {
      clusters = await this.fetchTelemetry();
    } catch (err) {
      this.logger.warn(`Error fetching usage. (${err})`);
      return;
    }

    try {
      const { telemetryUrl } = telemetryConfig;
      await this.sendTelemetry(telemetryUrl, clusters);

      await this.updateLastReported();
    } catch (err) {
      await this.updateReportFailure(telemetryConfig);

      this.logger.warn(`Error sending telemetry usage data. (${err})`);
    }
  }

  private async getCurrentConfigs(): Promise<TelemetryConfig> {
    const telemetrySavedObject = await getTelemetrySavedObject(this.internalRepository!);
    const config = await firstValueFrom(this.config$);
    const currentKibanaVersion = this.currentKibanaVersion;
    const configTelemetrySendUsageFrom = config.sendUsageFrom;
    const allowChangingOptInStatus = config.allowChangingOptInStatus;
    const configTelemetryOptIn = typeof config.optIn === 'undefined' ? null : config.optIn;
    const telemetryUrl = getTelemetryChannelEndpoint({
      channelName: 'snapshot',
      env: config.sendUsageTo,
    });
    const { failureCount, failureVersion } = getTelemetryFailureDetails({
      telemetrySavedObject,
    });

    const lastReported = telemetrySavedObject ? telemetrySavedObject.lastReported : void 0;

    // If the lastReported value in the SO is more recent than the in-memory one, refresh the memory (another instance or the browser may have reported it)
    if (lastReported && lastReported > this.lastReported$.value) {
      this.lastReported$.next(lastReported);
    }

    return {
      telemetryOptIn: getTelemetryOptIn({
        currentKibanaVersion,
        telemetrySavedObject,
        allowChangingOptInStatus,
        configTelemetryOptIn,
      }),
      telemetrySendUsageFrom: getTelemetrySendUsageFrom({
        telemetrySavedObject,
        configTelemetrySendUsageFrom,
      }),
      telemetryUrl,
      failureCount,
      failureVersion,
      currentVersion: currentKibanaVersion,
      lastReported,
    };
  }

  private async updateLastReported() {
    this.lastReported$.next(Date.now());
    updateTelemetrySavedObject(this.internalRepository!, {
      reportFailureCount: 0,
      lastReported: this.lastReported$.value,
    }).catch((err) => {
      err.message = `Failed to update the telemetry saved object: ${err.message}`;
      this.logger.debug(err);
    });
  }

  private async updateReportFailure({ failureCount }: { failureCount: number }) {
    this.isOnline$.next(false);
    updateTelemetrySavedObject(this.internalRepository!, {
      reportFailureCount: failureCount + 1,
      reportFailureVersion: this.currentKibanaVersion,
    }).catch((err) => {
      err.message = `Failed to update the telemetry saved object: ${err.message}`;
      this.logger.debug(err);
    });
  }

  private shouldSendReport({
    telemetryOptIn,
    telemetrySendUsageFrom,
    lastReported,
  }: TelemetryConfig) {
    if (telemetryOptIn && telemetrySendUsageFrom === 'server') {
      // Check both: in-memory and SO-driven value.
      // This will avoid the server retrying over and over when it has issues with storing the state in the SO.
      if (
        isReportIntervalExpired(this.lastReported$.value) &&
        isReportIntervalExpired(lastReported)
      ) {
        return true;
      }
    }
    return false;
  }

  private async fetchTelemetry(): Promise<EncryptedTelemetryPayload> {
    return await this.telemetryCollectionManager!.getStats({
      unencrypted: false,
    });
  }

  private async sendTelemetry(
    telemetryUrl: string,
    payload: EncryptedTelemetryPayload
  ): Promise<void> {
    this.logger.debug(`Sending usage stats.`);

    await Promise.all(
      payload.map(async ({ clusterUuid, stats }) => {
        await fetch(telemetryUrl, {
          method: 'post',
          body: stats,
          headers: {
            'Content-Type': 'application/json',
            'X-Elastic-Stack-Version': this.currentKibanaVersion,
            'X-Elastic-Cluster-ID': clusterUuid,
            'X-Elastic-Content-Encoding': PAYLOAD_CONTENT_ENCODING,
          },
        });
      })
    );
  }
}
