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
// @ts-ignore
import fetch from 'node-fetch';
import { telemetryCollectionManager } from './collection_manager';
import {
  getTelemetryOptIn,
  getTelemetrySendUsageFrom,
  getTelemetryFailureDetails,
} from './telemetry_config';
import { getTelemetrySavedObject, updateTelemetrySavedObject } from './telemetry_repository';
import { REPORT_INTERVAL_MS } from '../common/constants';

export class FetcherTask {
  private readonly initialCheckDelayMs = 60 * 1000 * 5;
  private readonly checkIntervalMs = 60 * 1000 * 60 * 12;
  private intervalId?: NodeJS.Timeout;
  private lastReported?: number;
  private currentVersion: string;
  private isSending = false;
  private server: any;

  constructor(server: any) {
    this.server = server;
    this.currentVersion = this.server.config().get('pkg.version');
  }

  private getInternalRepository = () => {
    const { getSavedObjectsRepository } = this.server.savedObjects;
    const { callWithInternalUser } = this.server.plugins.elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);
    return internalRepository;
  };

  private getCurrentConfigs = async () => {
    const internalRepository = this.getInternalRepository();
    const telemetrySavedObject = await getTelemetrySavedObject(internalRepository);
    const config = this.server.config();
    const currentKibanaVersion = config.get('pkg.version');
    const configTelemetrySendUsageFrom = config.get('telemetry.sendUsageFrom');
    const allowChangingOptInStatus = config.get('telemetry.allowChangingOptInStatus');
    const configTelemetryOptIn = config.get('telemetry.optIn');
    const telemetryUrl = config.get('telemetry.url') as string;
    const { failureCount, failureVersion } = await getTelemetryFailureDetails({
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
  };

  private updateLastReported = async () => {
    const internalRepository = this.getInternalRepository();
    this.lastReported = Date.now();
    updateTelemetrySavedObject(internalRepository, {
      reportFailureCount: 0,
      lastReported: this.lastReported,
    });
  };

  private updateReportFailure = async ({ failureCount }: { failureCount: number }) => {
    const internalRepository = this.getInternalRepository();

    updateTelemetrySavedObject(internalRepository, {
      reportFailureCount: failureCount + 1,
      reportFailureVersion: this.currentVersion,
    });
  };

  private shouldSendReport = ({
    telemetryOptIn,
    telemetrySendUsageFrom,
    reportFailureCount,
    currentVersion,
    reportFailureVersion,
  }: any) => {
    if (reportFailureCount > 2 && reportFailureVersion === currentVersion) {
      return false;
    }

    if (telemetryOptIn && telemetrySendUsageFrom === 'server') {
      if (!this.lastReported || Date.now() - this.lastReported > REPORT_INTERVAL_MS) {
        return true;
      }
    }
    return false;
  };

  private fetchTelemetry = async () => {
    return await telemetryCollectionManager.getStats({
      unencrypted: false,
      server: this.server,
      start: moment()
        .subtract(20, 'minutes')
        .toISOString(),
      end: moment().toISOString(),
    });
  };

  private sendTelemetry = async (url: string, cluster: any): Promise<void> => {
    this.server.log(['debug', 'telemetry', 'fetcher'], `Sending usage stats.`);
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
  };

  private sendIfDue = async () => {
    if (this.isSending) {
      return;
    }
    const telemetryConfig = await this.getCurrentConfigs();
    if (!this.shouldSendReport(telemetryConfig)) {
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

      this.server.log(
        ['warning', 'telemetry', 'fetcher'],
        `Error sending telemetry usage data: ${err}`
      );
    }
    this.isSending = false;
  };

  public start = () => {
    setTimeout(() => {
      this.sendIfDue();
      this.intervalId = setInterval(() => this.sendIfDue(), this.checkIntervalMs);
    }, this.initialCheckDelayMs);
  };

  public stop = () => {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  };
}
