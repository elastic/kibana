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

import { UnreachableCaseError } from './util';
import { Metric, Stats, UiStatsMetricReport, METRIC_TYPE } from './metrics';

export interface Report {
  uiStatsMetrics: {
    [key: string]: UiStatsMetricReport;
  };
}

export class ReportManager {
  public report: Report;
  constructor(report?: Report) {
    this.report = report || ReportManager.createReport();
  }
  static createReport() {
    return { uiStatsMetrics: {} };
  }
  public clearReport() {
    this.report = ReportManager.createReport();
  }
  public isReportEmpty(): boolean {
    return Object.keys(this.report.uiStatsMetrics).length === 0;
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
  assignReports(newMetrics: Metric[]) {
    newMetrics.forEach(newMetric => this.assignReport(this.report, newMetric));
  }
  static createMetricKey(metric: Metric): string {
    switch (metric.type) {
      case METRIC_TYPE.CLICK:
      case METRIC_TYPE.LOADED:
      case METRIC_TYPE.COUNT: {
        const { appName, type, eventName } = metric;
        return `${appName}-${type}-${eventName}`;
      }
      default:
        throw new UnreachableCaseError(metric.type);
    }
  }
  private assignReport(report: Report, metric: Metric) {
    switch (metric.type) {
      case METRIC_TYPE.CLICK:
      case METRIC_TYPE.LOADED:
      case METRIC_TYPE.COUNT: {
        const { appName, type, eventName, count } = metric;
        const key = ReportManager.createMetricKey(metric);
        const existingStats = (report.uiStatsMetrics[key] || {}).stats;
        this.report.uiStatsMetrics[key] = {
          key,
          appName,
          eventName,
          type,
          stats: this.incrementStats(count, existingStats),
        };
        return;
      }
      default:
        throw new UnreachableCaseError(metric.type);
    }
  }
}
