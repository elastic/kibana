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
import { getTelemetryOptIn, getTelemetrySendUsageFrom } from './telemetry_config';
import { getTelemetrySavedObject, updateTelemetrySavedObject } from './telemetry_repository';
import { REPORT_INTERVAL_MS } from '../common/constants';
import { getXpackConfigWithDeprecated } from '../common/get_xpack_config_with_deprecated';

export class FetcherTask {
  private readonly checkDurationMs = 60 * 1000 * 5;
  private intervalId?: NodeJS.Timeout;
  private lastReported?: number;
  private isSending = false;
  private server: any;

  constructor(server: any) {
    this.server = server;
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
    const telemetryUrl = getXpackConfigWithDeprecated(config, 'telemetry.url') as string;

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
    };
  };

  private updateLastReported = async () => {
    const internalRepository = this.getInternalRepository();
    this.lastReported = Date.now();
    updateTelemetrySavedObject(internalRepository, {
      lastReported: this.lastReported,
    });
  };

  private shouldSendReport = ({ telemetryOptIn, telemetrySendUsageFrom }: any) => {
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
    await fetch(url, {
      method: 'post',
      body: cluster,
    });
  };

  private sendIfDue = async () => {
    if (this.isSending) {
      return;
    }
    try {
      const telemetryConfig = await this.getCurrentConfigs();
      if (!this.shouldSendReport(telemetryConfig)) {
        return;
      }

      // mark that we are working so future requests are ignored until we're done
      this.isSending = true;
      const clusters = await this.fetchTelemetry();
      for (const cluster of clusters) {
        await this.sendTelemetry(telemetryConfig.telemetryUrl, cluster);
      }

      await this.updateLastReported();
    } catch (err) {
      this.server.log(
        ['warning', 'telemetry', 'fetcher'],
        `Error sending telemetry usage data: ${err}`
      );
    }
    this.isSending = false;
  };

  public start = () => {
    this.intervalId = setInterval(() => this.sendIfDue(), this.checkDurationMs);
  };
  public stop = () => {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  };
}
