/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { wrapArray } from './util';
import { ApplicationUsageTracker } from './application_usage_tracker';
import { Metric, METRIC_TYPE } from './metrics';
const REPORT_VERSION = 3;

import type { UiCounterMetric, UiCounterMetricType } from './metrics/ui_counter';
import type { UserAgentMetric } from './metrics/user_agent';
import type { ApplicationUsageMetric } from './metrics/application_usage';

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
      appId: string;
      viewId: string;
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
      case METRIC_TYPE.APPLICATION_USAGE: {
        const { appId, viewId } = metric as ApplicationUsageMetric;
        return ApplicationUsageTracker.serializeKey({ appId, viewId });
      }
      default:
        const { appName, eventName, type } = metric as UiCounterMetric;
        return `${appName}-${type}-${eventName}`;
    }
  }
  private assignReport(report: Report, metric: Metric) {
    const key = ReportManager.createMetricKey(metric);
    switch (metric.type) {
      case METRIC_TYPE.USER_AGENT: {
        const { appName, type, userAgent } = metric as UserAgentMetric;
        if (userAgent) {
          report.userAgent = {
            [key]: {
              key,
              appName,
              type,
              userAgent,
            },
          };
        }

        return;
      }
      case METRIC_TYPE.APPLICATION_USAGE: {
        const { numberOfClicks, startTime, appId, viewId } = metric as ApplicationUsageMetric;
        const minutesOnScreen = moment().diff(startTime, 'minutes', true);

        report.application_usage = report.application_usage || {};
        const appExistingData = report.application_usage[key] || {
          minutesOnScreen: 0,
          numberOfClicks: 0,
          appId,
          viewId,
        };
        report.application_usage[key] = {
          ...appExistingData,
          minutesOnScreen: appExistingData.minutesOnScreen + minutesOnScreen,
          numberOfClicks: appExistingData.numberOfClicks + numberOfClicks,
        };

        return;
      }
      default:
        const { appName, type, eventName, count } = metric as UiCounterMetric;
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
  }
}
