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

import { Reports, ReportTypes, createReport } from './report';

export interface ReporterConfig {
  debug: boolean;
  http: ReportHTTP;
  storage?: Map;
  checkInterval?: number;
}

export interface ReportHTTP {
  (reports: Reports[]): Promise<void>
}

export class Reporter {
  storageKey = 'analytics';
  checkInterval: number;
  interval: any;
  http: ReportHTTP;
  reports: Reports[]
  private debug: boolean;
  private storage?: Map<string, any>;

  constructor(config: ReporterConfig) {
    this.http =  config.http;
    this.checkInterval = config.checkInterval || 1000;
    this.interval = null;
    this.storage = config.storage;
    if (this.storage) {

    }

    this.reports = [];
    this.debug = config.debug;
  }

  getStorage() {
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
        if (this.reports.length) {
          this.sendReports();
        }
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

  public report(type: ReportTypes, appName: string, eventName: string) {
    if (this.debug) {
      console.debug(`${type} Report -> (${appName}:${eventName})`);
    }
    const report = createReport(type, appName, eventName);
    this.insertReport(report);
  }

  protected insertReport(report: Reports) {
    this.reports.push(report);
    this.storeReports();
  }

  public async sendReports() {
    try {
      await this.http(this.reports);
      this.flushStorage();
    } catch (err) {
      if (this.debug) {
        console.debug('Error Sending Reports', err);
      }
    }
    this.start();
  }
}

export function createReporter(reportedConf: ReporterConfig) {
  const reporter = new Reporter(reportedConf);
  reporter.start();
  return reporter;
}
