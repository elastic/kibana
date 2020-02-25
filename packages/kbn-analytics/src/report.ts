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

import { UnreachableCaseError, wrapArray } from './util';
import { Metric, Stats, UiStatsMetricType, METRIC_TYPE } from './metrics';
const REPORT_VERSION = 1;

export interface Report {
  reportVersion: typeof REPORT_VERSION;
  uiStatsMetrics?: Record<
    string,
    {
      key: string;
      appName: string;
      eventName: string;
      type: UiStatsMetricType;
      stats: Stats;
    }
  >;
  userAgent?: Record<
    string,
    {
      userAgent: string;
      key: string;
      type: METRIC_TYPE.USER_AGENT;
      appName: string;
    }
  >;
}

export class ReportManager {
  static REPORT_VERSION = REPORT_VERSION;
  public report: Report;
  constructor(report?: Report) {
    this.report = report || ReportManager.createReport();
  }
  static createReport(): Report {
    return { reportVersion: REPORT_VERSION };
  }
  public clearReport() {
    this.report = ReportManager.createReport();
  }
  public isReportEmpty(): boolean {
    const { uiStatsMetrics, userAgent } = this.report;
    const noUiStats = !uiStatsMetrics || Object.keys(uiStatsMetrics).length === 0;
    const noUserAgent = !userAgent || Object.keys(userAgent).length === 0;
    return noUiStats && noUserAgent;
  }
  private incrementStats(count: number, stats?: Stats): Stats {
    const { min = 0, max = 0, sum = 0 } = stats || {};
    const newMin = Math.min(min, count);
    const newMax = Math.max(max, count);
    const newAvg = newMin + newMax / 2;
    const newSum = sum + count;

    return {
      min: newMin,
      max: newMax,
      avg: newAvg,
      sum: newSum,
    };
  }
  assignReports(newMetrics: Metric | Metric[]) {
    wrapArray(newMetrics).forEach(newMetric => this.assignReport(this.report, newMetric));
    return { report: this.report };
  }
  static createMetricKey(metric: Metric): string {
    switch (metric.type) {
      case METRIC_TYPE.USER_AGENT: {
        const { appName, type } = metric;
        return `${appName}-${type}`;
      }
      case METRIC_TYPE.CLICK:
      case METRIC_TYPE.LOADED:
      case METRIC_TYPE.COUNT: {
        const { appName, eventName, type } = metric;
        return `${appName}-${type}-${eventName}`;
      }
      default:
        throw new UnreachableCaseError(metric);
    }
  }
  private assignReport(report: Report, metric: Metric) {
    const key = ReportManager.createMetricKey(metric);
    switch (metric.type) {
      case METRIC_TYPE.USER_AGENT: {
        const { appName, type, userAgent } = metric;
        if (userAgent) {
          report.userAgent = {
            [key]: {
              key,
              appName,
              type,
              userAgent: metric.userAgent,
            },
          };
        }

        return;
      }
      case METRIC_TYPE.CLICK:
      case METRIC_TYPE.LOADED:
      case METRIC_TYPE.COUNT: {
        const { appName, type, eventName, count } = metric;
        report.uiStatsMetrics = report.uiStatsMetrics || {};
        const existingStats = (report.uiStatsMetrics[key] || {}).stats;
        report.uiStatsMetrics[key] = {
          key,
          appName,
          eventName,
          type,
          stats: this.incrementStats(count, existingStats),
        };
        return;
      }
      default:
        throw new UnreachableCaseError(metric);
    }
  }
}
