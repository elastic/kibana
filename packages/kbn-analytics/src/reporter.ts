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

import { wrapArray } from './util';
import { Metric, createUiStatsMetric, trackUsageAgent, UiStatsMetricType } from './metrics';

import { Storage, ReportStorageManager } from './storage';
import { Report, ReportManager } from './report';
import { ApplicationUsage } from './metrics';

export interface ReporterConfig {
  http: ReportHTTP;
  storage?: Storage;
  checkInterval?: number;
  debug?: boolean;
  storageKey?: string;
}

export type ReportHTTP = (report: Report) => Promise<void>;

export class Reporter {
  checkInterval: number;
  private interval?: NodeJS.Timer;
  private lastAppId?: string;
  private http: ReportHTTP;
  private reportManager: ReportManager;
  private storageManager: ReportStorageManager;
  private readonly applicationUsage: ApplicationUsage;
  private debug: boolean;
  private retryCount = 0;
  private readonly maxRetries = 3;
  private started = false;

  constructor(config: ReporterConfig) {
    const { http, storage, debug, checkInterval = 90000, storageKey = 'analytics' } = config;
    this.http = http;
    this.checkInterval = checkInterval;
    this.applicationUsage = new ApplicationUsage();
    this.storageManager = new ReportStorageManager(storageKey, storage);
    const storedReport = this.storageManager.get();
    this.reportManager = new ReportManager(storedReport);
    this.debug = !!debug;
  }

  private saveToReport(newMetrics: Metric[]) {
    this.reportManager.assignReports(newMetrics);
    this.storageManager.store(this.reportManager.report);
  }

  private flushReport() {
    this.retryCount = 0;
    this.reportManager.clearReport();
    this.storageManager.store(this.reportManager.report);
  }

  public start = () => {
    if (!this.interval) {
      this.interval = setTimeout(() => {
        this.interval = undefined;
        this.sendReports();
      }, this.checkInterval);
    }

    if (this.started) {
      return;
    }

    if (window && document) {
      // Before leaving the page, make sure we store the current usage
      window.addEventListener('beforeunload', () => this.reportApplicationUsage());

      // Monitoring dashboards might be open in background and we are fine with that
      // but we don't want to report hours if the user goes to another tab and Kibana is not shown
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.lastAppId) {
          this.reportApplicationUsage(this.lastAppId);
        } else if (document.visibilityState === 'hidden') {
          this.reportApplicationUsage();

          // We also want to send the report now because intervals and timeouts be stalled when too long in the "hidden" state
          this.sendReports();
        }
      });
    }
    this.started = true;
    this.applicationUsage.start();
  };

  private log(message: any) {
    if (this.debug) {
      // eslint-disable-next-line
      console.debug(message);
    }
  }

  public reportUiStats = (
    appName: string,
    type: UiStatsMetricType,
    eventNames: string | string[],
    count?: number
  ) => {
    const metrics = wrapArray(eventNames).map((eventName) => {
      this.log(`${type} Metric -> (${appName}:${eventName}):`);
      const report = createUiStatsMetric({ type, appName, eventName, count });
      this.log(report);
      return report;
    });
    this.saveToReport(metrics);
  };

  public reportUserAgent = (appName: string) => {
    this.log(`Reporting user-agent.`);
    const report = trackUsageAgent(appName);
    this.saveToReport([report]);
  };

  public reportApplicationUsage(appId?: string) {
    this.log(`Reporting application changed to ${appId}`);
    this.lastAppId = appId || this.lastAppId;
    const appChangedReport = this.applicationUsage.appChanged(appId);
    if (appChangedReport) this.saveToReport([appChangedReport]);
  }

  public sendReports = async () => {
    if (!this.reportManager.isReportEmpty()) {
      try {
        await this.http(this.reportManager.report);
        this.flushReport();
      } catch (err) {
        this.log(`Error Sending Metrics Report ${err}`);
        this.retryCount = this.retryCount + 1;
        const versionMismatch =
          this.reportManager.report.reportVersion !== ReportManager.REPORT_VERSION;
        if (versionMismatch || this.retryCount > this.maxRetries) {
          this.flushReport();
        }
      }
    }
    this.start();
  };
}
