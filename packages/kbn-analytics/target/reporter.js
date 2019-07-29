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
const storage_1 = require("./storage");
const report_1 = require("./report");
class Reporter {
    constructor(config) {
        const { http, storage, debug, checkInterval = 10000, storageKey = 'analytics' } = config;
        this.http = http;
        this.checkInterval = checkInterval;
        this.interval = null;
        this.storageManager = new storage_1.ReportStorageManager(storageKey, storage);
        const storedReport = this.storageManager.get();
        this.reportManager = new report_1.ReportManager(storedReport);
        this.debug = !!debug;
    }
    saveToReport(newMetrics) {
        this.reportManager.assignReports(newMetrics);
        this.storageManager.store(this.reportManager.report);
    }
    flushReport() {
        this.reportManager.clearReport();
        this.storageManager.store(this.reportManager.report);
    }
    start() {
        if (!this.interval) {
            this.interval = setTimeout(() => {
                this.interval = null;
                this.sendReports();
            }, this.checkInterval);
        }
    }
    log(message) {
        if (this.debug) {
            // eslint-disable-next-line
            console.debug(message);
        }
    }
    reportUiStats(appName, type, eventNames, count) {
        const metrics = util_1.wrapArray(eventNames).map(eventName => {
            if (this)
                this.log(`${type} Metric -> (${appName}:${eventName}):`);
            const report = metrics_1.createUiStatsMetric({ type, appName, eventName, count });
            this.log(report);
            return report;
        });
        this.saveToReport(metrics);
    }
    async sendReports() {
        if (!this.reportManager.isReportEmpty()) {
            try {
                await this.http(this.reportManager.report);
                this.flushReport();
            }
            catch (err) {
                this.log(`Error Sending Metrics Report ${err}`);
            }
        }
        this.start();
    }
}
exports.Reporter = Reporter;
function createReporter(reportedConf) {
    const reporter = new Reporter(reportedConf);
    reporter.start();
    return reporter;
}
exports.createReporter = createReporter;
