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

import moment from 'moment';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
// @ts-ignore
import fetch from 'node-fetch';
import { TelemetryCollectionManagerPluginStart } from 'src/plugins/telemetry_collection_manager/server';
import {
  PluginInitializerContext,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsClient,
  CoreStart,
  ILegacyCustomClusterClient,
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
}

export class FetcherTask {
  private readonly initialCheckDelayMs = 60 * 1000 * 5;
  private readonly checkIntervalMs = 60 * 1000 * 60 * 12;
  private readonly config$: Observable<TelemetryConfigType>;
  private readonly currentKibanaVersion: string;
  private readonly logger: Logger;
  private intervalId?: NodeJS.Timeout;
  private lastReported?: number;
  private isSending = false;
  private internalRepository?: SavedObjectsClientContract;
  private telemetryCollectionManager?: TelemetryCollectionManagerPluginStart;
  private elasticsearchClient?: ILegacyCustomClusterClient;

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
    this.elasticsearchClient = elasticsearch.legacy.createClient('telemetry-fetcher');

    setTimeout(() => {
      this.sendIfDue();
      this.intervalId = setInterval(() => this.sendIfDue(), this.checkIntervalMs);
    }, this.initialCheckDelayMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.elasticsearchClient) {
      this.elasticsearchClient.close();
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
      this.logger.warn(`Error fetching telemetry configs: ${err}`);
      return;
    }

    if (!telemetryConfig || !this.shouldSendReport(telemetryConfig)) {
      return;
    }

    try {
      this.isSending = true;
      const clusters = await this.fetchTelemetry();
      const { telemetryUrl } = telemetryConfig;
      for (const cluster of clusters) {
        await this.sendTelemetry(telemetryUrl, cluster);
      }

      await this.updateLastReported();
    } catch (err) {
      await this.updateReportFailure(telemetryConfig);

      this.logger.warn(`Error sending telemetry usage data: ${err}`);
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
    };
  }

  private async updateLastReported() {
    this.lastReported = Date.now();
    updateTelemetrySavedObject(this.internalRepository!, {
      reportFailureCount: 0,
      lastReported: this.lastReported,
    });
  }

  private async updateReportFailure({ failureCount }: { failureCount: number }) {
    updateTelemetrySavedObject(this.internalRepository!, {
      reportFailureCount: failureCount + 1,
      reportFailureVersion: this.currentKibanaVersion,
    });
  }

  private shouldSendReport({
    telemetryOptIn,
    telemetrySendUsageFrom,
    reportFailureCount,
    currentVersion,
    reportFailureVersion,
  }: any) {
    if (reportFailureCount > 2 && reportFailureVersion === currentVersion) {
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
      start: moment().subtract(20, 'minutes').toISOString(),
      end: moment().toISOString(),
    });
  }

  private async sendTelemetry(url: string, cluster: any): Promise<void> {
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
    });
  }
}
