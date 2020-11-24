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

import moment from 'moment-timezone';
import { UnreachableCaseError, wrapArray } from './util';
import { Metric, UiCounterMetricType, METRIC_TYPE } from './metrics';
const REPORT_VERSION = 2;

export interface Report {
  reportVersion: typeof REPORT_VERSION;
  uiCounter?: Record<
    string,
    {
      key: string;
      appName: string;
      eventName: string;
      type: UiCounterMetricType;
      total: number;
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
  application_usage?: Record<
    string,
    {
      minutesOnScreen: number;
      numberOfClicks: number;
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
    const { uiCounter, userAgent, application_usage: appUsage } = this.report;
    const noUiCounters = !uiCounter || Object.keys(uiCounter).length === 0;
    const noUserAgents = !userAgent || Object.keys(userAgent).length === 0;
    const noAppUsage = !appUsage || Object.keys(appUsage).length === 0;
    return noUiCounters && noUserAgents && noAppUsage;
  }
  private incrementTotal(count: number, currentTotal?: number): number {
    const currentTotalNumber = typeof currentTotal === 'number' ? currentTotal : 0;
    return count + currentTotalNumber;
  }
  assignReports(newMetrics: Metric | Metric[]) {
    wrapArray(newMetrics).forEach((newMetric) => this.assignReport(this.report, newMetric));
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
      case METRIC_TYPE.APPLICATION_USAGE:
        return metric.appId;
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
        report.uiCounter = report.uiCounter || {};
        const currentTotal = report.uiCounter[key]?.total;
        report.uiCounter[key] = {
          key,
          appName,
          eventName,
          type,
          total: this.incrementTotal(count, currentTotal),
        };
        return;
      }
      case METRIC_TYPE.APPLICATION_USAGE:
        const { numberOfClicks, startTime } = metric;
        const minutesOnScreen = moment().diff(startTime, 'minutes', true);

        report.application_usage = report.application_usage || {};
        const appExistingData = report.application_usage[key] || {
          minutesOnScreen: 0,
          numberOfClicks: 0,
        };
        report.application_usage[key] = {
          minutesOnScreen: appExistingData.minutesOnScreen + minutesOnScreen,
          numberOfClicks: appExistingData.numberOfClicks + numberOfClicks,
        };
        break;
      default:
        throw new UnreachableCaseError(metric);
    }
  }
}
