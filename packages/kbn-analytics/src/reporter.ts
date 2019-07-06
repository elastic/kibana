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

import { Reports } from './report';

export interface ReporterConfig {
  debug: boolean;
  http: ReportHTTP;
  checkInterval?: number;
}

export interface ReportHTTP {
  (reports: Reports[keyof Reports][]): Promise<void>
}

export class Reporter {
  checkInterval: number;
  interval: any;
  http: ReportHTTP;
  reports: Reports[keyof Reports][]
  debug: boolean;

  constructor(config: ReporterConfig) {
    this.http =  config.http;
    this.checkInterval = config.checkInterval || 1000;
    this.interval = null;
    this.reports = [];
    this.debug = config.debug;
  }

  start() {
    if (!this.interval) {
      this.interval = setTimeout(() => {
        this.interval = null;
        this.sendReports();
      }, this.checkInterval);
    }
  }

  stop() {
    clearTimeout(this.interval);
  }

  insertReport<K extends keyof Reports>(report: Reports[K]) {
    this.reports.push(report);
  }

  async sendReports() {
    try {
      await this.http(this.reports);
    } catch (err) {
      if (this.debug) {
        console.log('Error Sending Reports', err);
      }
    }
    this.start();
  }
}

export function createReporter(reportedConf: ReporterConfig): Reporter {
  const reporter = new Reporter(reportedConf);
  reporter.start();
  return reporter;
}
