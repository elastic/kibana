"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const metrics_1 = require("./metrics");
class ReportManager {
    constructor(report) {
        this.report = report || ReportManager.createReport();
    }
    static createReport() {
        return { uiStatsMetrics: {} };
    }
    clearReport() {
        this.report = ReportManager.createReport();
    }
    isReportEmpty() {
        return Object.keys(this.report.uiStatsMetrics).length === 0;
    }
    incrementStats(count, stats) {
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
    assignReports(newMetrics) {
        newMetrics.forEach(newMetric => this.assignReport(this.report, newMetric));
    }
    static createMetricKey(metric) {
        switch (metric.type) {
            case metrics_1.METRIC_TYPE.CLICK:
            case metrics_1.METRIC_TYPE.LOADED:
            case metrics_1.METRIC_TYPE.COUNT: {
                const { appName, type, eventName } = metric;
                return `${appName}-${type}-${eventName}`;
            }
            default:
                throw new util_1.UnreachableCaseError(metric.type);
        }
    }
    assignReport(report, metric) {
        switch (metric.type) {
            case metrics_1.METRIC_TYPE.CLICK:
            case metrics_1.METRIC_TYPE.LOADED:
            case metrics_1.METRIC_TYPE.COUNT: {
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
                throw new util_1.UnreachableCaseError(metric.type);
        }
    }
}
exports.ReportManager = ReportManager;
