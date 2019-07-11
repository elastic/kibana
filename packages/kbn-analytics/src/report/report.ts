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

import {
  LoadedReport,
  ClickReport,
  createClickReport,
  createLoadedReport,
  createCountReport,
  CountReport,
} from './stats';
// import { NagivationReport, createNavigationReport } from './performance';

export interface BaseReport {
  type: string;
  appName: string;
  eventName: string;
}

class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${val}`);
  }
}

export type ReportTypes = Reports['type'];
export type Reports = ClickReport | LoadedReport | CountReport;

export function getReport(type: ReportTypes) {
  switch (type) {
    case 'click':
      return createClickReport;
    case 'loaded':
      return createLoadedReport;
    case 'count':
      return createCountReport;
    // case 'memory': return createMemoryReport(appName, eventName);
    // case 'error': return createNavigationReport(appName, eventName);
    default:
      throw new UnreachableCaseError(type);
  }
}
