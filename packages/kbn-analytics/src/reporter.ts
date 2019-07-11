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

import { ToolingLog } from '@kbn/dev-utils';
import { Reports, ReportTypes, getReport } from './report';

export interface ReporterConfig {
  http: ReportHTTP;
  storage?: Map<string, any>;
  checkInterval?: number;
  logLevel?: 'silent' | 'error' | 'warning' | 'info' | 'debug' | 'verbose';
}

export type ReportHTTP = (reports: Reports[]) => Promise<void>;

export class Reporter {
  storageKey = 'analytics';
  checkInterval: number;
  interval: any;
  http: ReportHTTP;
  reports: Reports[];
  private storage?: Map<string, any>;
  private log: ToolingLog;

  constructor(config: ReporterConfig) {
    const { http, checkInterval = 10000, storage, logLevel = 'verbose' } = config;
    this.http = http;
    this.checkInterval = checkInterval;
    this.interval = null;
    this.storage = storage;
    this.reports = this.getFromStorage();
    this.log = new ToolingLog({ level: logLevel, writeTo: process.stdout });
  }

  getFromStorage() {
    if (!this.storage) return [];
    return this.storage.get(this.storageKey);
  }

  storeReports() {
    if (!this.storage) return;
    this.storage.set(this.storageKey, this.reports);
  }

  public start() {
    if (!this.interval) {
      this.interval = setTimeout(() => {
        this.interval = null;
        this.sendReports();
      }, this.checkInterval);
    }
  }
  flushStorage() {
    if (this.storage) {
      this.storage.set(this.storageKey, []);
    }
    this.reports = [];
  }

  public stop() {
    clearTimeout(this.interval);
  }

  public report(
    appName: string,
    type: ReportTypes,
    events: string | string[],
    additionalConfig = {}
  ) {
    const eventNames = Array.isArray(events) ? events : [events];
    eventNames.forEach(eventName => {
      this.log.debug(`${type} Report -> (${appName}:${eventName})`);
      const report = getReport(type)({ appName, eventName, ...additionalConfig });
      this.insertReport(report);
    });
  }

  protected insertReport(report: Reports) {
    this.reports.push(report);
    this.storeReports();
  }

  public async sendReports() {
    try {
      if (this.reports.length) {
        await this.http(this.reports);
        this.flushStorage();
      }
    } catch (err) {
      this.log.error(`Error Sending Reports ${err}`);
    }
    this.start();
  }
}

export function createReporter(reportedConf: ReporterConfig) {
  const reporter = new Reporter(reportedConf);
  reporter.start();
  return reporter;
}
