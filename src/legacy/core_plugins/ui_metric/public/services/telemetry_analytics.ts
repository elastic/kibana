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

import { createReporter, Reporter, UiStatsMetricType } from '@kbn/analytics';

let telemetryReporter: Reporter;

export const setTelemetryReporter = (aTelemetryReporter: Reporter): void => {
  telemetryReporter = aTelemetryReporter;
};

export const getTelemetryReporter = () => {
  return telemetryReporter;
};

export const createUiStatsReporter = (appName: string) => (
  type: UiStatsMetricType,
  eventNames: string | string[],
  count?: number
): void => {
  if (telemetryReporter) {
    return telemetryReporter.reportUiStats(appName, type, eventNames, count);
  }
};

interface AnalyicsReporterConfig {
  localStorage: any;
  basePath: string;
  debug: boolean;
  $http: ng.IHttpService;
}

export function createAnalyticsReporter(config: AnalyicsReporterConfig) {
  const { localStorage, basePath, $http, debug } = config;

  return createReporter({
    debug,
    storage: localStorage,
    async http(report) {
      const url = `${basePath}/api/telemetry/report`;
      await $http.post(url, { report });
    },
  });
}
