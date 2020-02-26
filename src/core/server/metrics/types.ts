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

import { Observable } from 'rxjs';
import { OpsProcessMetrics, OpsOsMetrics, OpsServerMetrics } from './collectors';

export interface MetricsServiceSetup {
  getOpsMetrics$: () => Observable<OpsMetrics>;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsServiceStart {}

export type InternalMetricsServiceSetup = MetricsServiceSetup;
export type InternalMetricsServiceStart = MetricsServiceStart;

/**
 * TODO documentation
 *
 * @public
 */
export interface OpsMetrics {
  /** Process related metrics */
  process: OpsProcessMetrics;
  /** OS related metrics */
  os: OpsOsMetrics;
  /** server response time stats */
  response_times: OpsServerMetrics['response_times'];
  /** server requests stats */
  requests: OpsServerMetrics['requests'];
  /** number of current concurrent connections to the server */
  concurrent_connections: OpsServerMetrics['concurrent_connections'];
}
