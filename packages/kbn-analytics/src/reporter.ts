/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import { wrapArray } from './util';
import { Metric, createUiCounterMetric, trackUsageAgent, ApplicationUsageMetric } from './metrics';
import { Storage, ReportStorageManager } from './storage';
import { Report, ReportManager } from './report';

export interface ReporterConfig {
  http: ReportHTTP;
  logger: Logger;
  storage?: Storage;
  checkInterval?: number;
  storageKey?: string;
}

export type ReportHTTP = (report: Report) => Promise<void>;

export class Reporter {
  checkInterval: number;
  private interval?: NodeJS.Timer;
  private http: ReportHTTP;
  private logger: Logger;
  private reportManager: ReportManager;
  private storageManager: ReportStorageManager;
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(config: ReporterConfig) {
    const { http, logger, storage, checkInterval = 90000, storageKey = 'analytics' } = config;

    this.http = http;
    this.logger = logger;
    this.checkInterval = checkInterval;
    this.storageManager = new ReportStorageManager(storageKey, storage);
    const storedReport = this.storageManager.get();
    this.reportManager = new ReportManager(storedReport);
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
  };

  public reportUiCounter = (
    appName: string,
    type: string,
    eventNames: string | string[],
    count?: number
  ) => {
    const metrics = wrapArray(eventNames).map((eventName) => {
      this.logger.debug(`${type} Metric -> (${appName}:${eventName}):`);
      const report = createUiCounterMetric({ type, appName, eventName, count });
      if (this.logger.isLevelEnabled('debug')) {
        this.logger.debug(JSON.stringify(report));
      }
      return report;
    });
    this.saveToReport(metrics);
  };

  public reportUserAgent = (appName: string) => {
    this.logger.debug(`Reporting user-agent.`);
    const report = trackUsageAgent(appName);
    this.saveToReport([report]);
  };

  public reportApplicationUsage(appUsageReport: ApplicationUsageMetric) {
    this.logger.debug(
      `Reporting application usage for ${appUsageReport.appId}, ${appUsageReport.viewId}`
    );
    this.saveToReport([appUsageReport]);
  }

  public sendReports = async () => {
    if (!this.reportManager.isReportEmpty()) {
      try {
        await this.http(this.reportManager.report);
        this.flushReport();
      } catch (err) {
        this.logger.warn(`Error Sending Metrics Report ${err}`);
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
