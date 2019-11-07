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

import { Reporter, UiStatsMetricType } from '@kbn/analytics';
// @ts-ignore
import { addSystemApiHeader } from 'ui/system_api';

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

export const trackUserAgent = (appName: string) => {
  if (telemetryReporter) {
    return telemetryReporter.reportUserAgent(appName);
  }
};

interface AnalyicsReporterConfig {
  localStorage: any;
  debug: boolean;
  kfetch: any;
}

export function createAnalyticsReporter(config: AnalyicsReporterConfig) {
  const { localStorage, debug, kfetch } = config;

  return new Reporter({
    debug,
    storage: localStorage,
    async http(report) {
      const response = await kfetch({
        method: 'POST',
        pathname: '/api/telemetry/report',
        body: JSON.stringify(report),
        headers: addSystemApiHeader({}),
      });

      if (response.status !== 'ok') {
        throw Error('Unable to store report.');
      }
      return response;
    },
  });
}
