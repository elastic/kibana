/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import fetch from 'node-fetch';
import type { TelemetryCollectionManagerPluginStart } from 'src/plugins/telemetry_collection_manager/server';
import {
  PluginInitializerContext,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsClient,
  CoreStart,
} from '../../../core/server';
import {
  getTelemetryChannelEndpoint,
  getTelemetryOptIn,
  getTelemetrySendUsageFrom,
  getTelemetryFailureDetails,
} from '../common/telemetry_config';
import { getTelemetrySavedObject, updateTelemetrySavedObject } from './telemetry_repository';
import { PAYLOAD_CONTENT_ENCODING } from '../common/constants';
import type { EncryptedTelemetryPayload } from '../common/types';
import { TelemetryConfigType } from './config';
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

export class FetcherTask {
  private readonly initialCheckDelayMs = 60 * 1000 * 5;
  private readonly checkIntervalMs = 60 * 1000 * 60 * 12;
  private readonly config$: Observable<TelemetryConfigType>;
  private readonly currentKibanaVersion: string;
  private readonly logger: Logger;
  private intervalId?: Subscription;
  private lastReported?: number;
  private isSending = false;
  private internalRepository?: SavedObjectsClientContract;
  private telemetryCollectionManager?: TelemetryCollectionManagerPluginStart;

  constructor(initializerContext: PluginInitializerContext<TelemetryConfigType>) {
    this.config$ = initializerContext.config.create();
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
    this.logger = initializerContext.logger.get('fetcher');
  }

  public start({ savedObjects }: CoreStart, { telemetryCollectionManager }: FetcherTaskDepsStart) {
    this.internalRepository = new SavedObjectsClient(savedObjects.createInternalRepository());
    this.telemetryCollectionManager = telemetryCollectionManager;

    this.intervalId = timer(this.initialCheckDelayMs, this.checkIntervalMs).subscribe(() =>
      this.sendIfDue()
    );
  }

  public stop() {
    if (this.intervalId) {
      this.intervalId.unsubscribe();
    }
  }

  private async sendIfDue() {
    if (this.isSending) {
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
    this.isSending = true;

    try {
      clusters = await this.fetchTelemetry();
    } catch (err) {
      this.logger.warn(`Error fetching usage. (${err})`);
      this.isSending = false;
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
    this.isSending = false;
  }

  private async getCurrentConfigs(): Promise<TelemetryConfig> {
    const telemetrySavedObject = await getTelemetrySavedObject(this.internalRepository!);
    const config = await this.config$.pipe(take(1)).toPromise();
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
      lastReported: telemetrySavedObject ? telemetrySavedObject.lastReported : void 0,
    };
  }

  private async updateLastReported() {
    this.lastReported = Date.now();
    updateTelemetrySavedObject(this.internalRepository!, {
      reportFailureCount: 0,
      lastReported: this.lastReported,
    }).catch((err) => {
      err.message = `Failed to update the telemetry saved object: ${err.message}`;
      this.logger.debug(err);
    });
  }

  private async updateReportFailure({ failureCount }: { failureCount: number }) {
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
    failureCount,
    failureVersion,
    currentVersion,
    lastReported,
  }: TelemetryConfig) {
    if (failureCount > 2 && failureVersion === currentVersion) {
      return false;
    }

    if (telemetryOptIn && telemetrySendUsageFrom === 'server') {
      // Check both: in-memory and SO-driven value.
      // This will avoid the server retrying over and over when it has issues with storing the state in the SO.
      if (isReportIntervalExpired(this.lastReported) && isReportIntervalExpired(lastReported)) {
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
    /**
     * send OPTIONS before sending usage data.
     * OPTIONS is less intrusive as it does not contain any payload and is used here to check if the endpoint is reachable.
     */
    await fetch(telemetryUrl, {
      method: 'options',
    });

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
