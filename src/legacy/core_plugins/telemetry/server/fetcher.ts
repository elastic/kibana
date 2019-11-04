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
import { REPORT_INTERVAL_MS } from '../common/constants';

interface TelemetrySavedConfigs {
  enabled?: null | boolean;
  usageFetcher?: 'string';
}

export class FetcherTask {
  private readonly checkDuration = 60000;
  private intervalId?: NodeJS.Timeout;
  private lastReported?: number;
  private isSending = false;
  private serverConfigs: any;
  private server: any;

  constructor(server: any, serverConfigs: any) {
    this.server = server;
    this.serverConfigs = serverConfigs;
  }

  private getInternalRepository = () => {
    const { getSavedObjectsRepository } = this.server.savedObjects;
    const { callWithInternalUser } = this.server.plugins.elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);
    return internalRepository;
  };

  private getCurrentConfigs = async () => {
    const internalRepository = this.getInternalRepository();
    let telemetrySavedConfigs: TelemetrySavedConfigs = {};
    try {
      const telemetrySavedObject = await internalRepository.get('telemetry', 'telemetry');
      telemetrySavedConfigs = telemetrySavedObject.attributes;
    } catch (err) {
      // Swallow errors getting telemetry saved object (Saved object NotFound or other errors)
      telemetrySavedConfigs = {};
    }

    return {
      telemetryOptIn:
        typeof telemetrySavedConfigs.enabled === 'boolean'
          ? telemetrySavedConfigs.enabled
          : this.serverConfigs.optIn,
      telemetryUsageFetcher:
        typeof telemetrySavedConfigs.usageFetcher === 'undefined'
          ? this.serverConfigs.usageFetcher
          : telemetrySavedConfigs.usageFetcher,
      telemetryUrl: this.serverConfigs.url,
    };
  };

  private updateLastReported = async () => {
    const internalRepository = this.getInternalRepository();
    this.lastReported = Date.now();
    await internalRepository.update('telemetry', 'telemetry', {
      lastReported: this.lastReported,
    });
  };

  private checkReportStatus = ({ telemetryOptIn, telemetryUsageFetcher }: any) => {
    if (telemetryOptIn && telemetryUsageFetcher === 'server') {
      if (!this.lastReported || Date.now() - this.lastReported > REPORT_INTERVAL_MS) {
        return true;
      }
    }
    return false;
  };
  private fetchTelemetry = async () => {
    const { getStats, title } = telemetryCollectionManager.getStatsGetter();
    this.server.log(['debug', 'telemetry', 'fetcher'], `Fetching usage using ${title} getter.`);
    const config = this.server.config();

    return await getStats({
      unencrypted: false,
      server: this.server,
      start: moment()
        .subtract(20, 'minutes')
        .toISOString(),
      end: moment().toISOString(),
      isDev: config.get('env.dev'),
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
    try {
      const telemetryConfig = await this.getCurrentConfigs();
      if (this.isSending || !this.checkReportStatus(telemetryConfig)) {
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
    this.intervalId = setInterval(() => this.sendIfDue(), this.checkDuration);
  };
  public stop = () => {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  };
}
