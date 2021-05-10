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
  ICustomClusterClient,
} from '../../../core/server';
import {
  getTelemetryOptIn,
  getTelemetrySendUsageFrom,
  getTelemetryFailureDetails,
} from '../common/telemetry_config';
import { getTelemetrySavedObject, updateTelemetrySavedObject } from './telemetry_repository';
import { REPORT_INTERVAL_MS } from '../common/constants';
import { TelemetryConfigType } from './config';

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
  private elasticsearchClient?: ICustomClusterClient;

  constructor(initializerContext: PluginInitializerContext<TelemetryConfigType>) {
    this.config$ = initializerContext.config.create();
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
    this.logger = initializerContext.logger.get('fetcher');
  }

  public start(
    { savedObjects, elasticsearch }: CoreStart,
    { telemetryCollectionManager }: FetcherTaskDepsStart
  ) {
    this.internalRepository = new SavedObjectsClient(savedObjects.createInternalRepository());
    this.telemetryCollectionManager = telemetryCollectionManager;
    this.elasticsearchClient = elasticsearch.createClient('telemetry-fetcher');

    this.intervalId = timer(this.initialCheckDelayMs, this.checkIntervalMs).subscribe(() =>
      this.sendIfDue()
    );
  }

  public stop() {
    if (this.intervalId) {
      this.intervalId.unsubscribe();
    }
    if (this.elasticsearchClient) {
      this.elasticsearchClient.close();
    }
  }

  private async areAllCollectorsReady() {
    return (await this.telemetryCollectionManager?.areAllCollectorsReady()) ?? false;
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

    let clusters: string[] = [];
    this.isSending = true;

    try {
      const allCollectorsReady = await this.areAllCollectorsReady();
      if (!allCollectorsReady) {
        throw new Error('Not all collectors are ready.');
      }
      clusters = await this.fetchTelemetry();
    } catch (err) {
      this.logger.warn(`Error fetching usage. (${err})`);
      this.isSending = false;
      return;
    }

    try {
      const { telemetryUrl } = telemetryConfig;
      for (const cluster of clusters) {
        await this.sendTelemetry(telemetryUrl, cluster);
      }

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
    const telemetryUrl = config.url;
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
  }: TelemetryConfig) {
    if (failureCount > 2 && failureVersion === currentVersion) {
      return false;
    }

    if (telemetryOptIn && telemetrySendUsageFrom === 'server') {
      if (!this.lastReported || Date.now() - this.lastReported > REPORT_INTERVAL_MS) {
        return true;
      }
    }
    return false;
  }

  private async fetchTelemetry() {
    return await this.telemetryCollectionManager!.getStats({
      unencrypted: false,
    });
  }

  private async sendTelemetry(url: string, cluster: string): Promise<void> {
    this.logger.debug(`Sending usage stats.`);
    /**
     * send OPTIONS before sending usage data.
     * OPTIONS is less intrusive as it does not contain any payload and is used here to check if the endpoint is reachable.
     */
    await fetch(url, {
      method: 'options',
    });

    await fetch(url, {
      method: 'post',
      body: cluster,
      headers: { 'X-Elastic-Stack-Version': this.currentKibanaVersion },
    });
  }
}
