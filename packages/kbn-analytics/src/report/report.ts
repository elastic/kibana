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

import { LoadReport, ClickReport, createClickReport, createLoadReport } from './stats';
import { NagivationReport, createNavigationReport } from './performance';

export interface BaseReport<Type extends ReportTypes> {
  type: Type;
  appName: string;
  eventName: string;
}

class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${val}`);
  }
}

export type Reports = ClickReport | LoadReport | NagivationReport;
export type ReportTypes = Reports['type'];


export function createReport(type: ReportTypes, appName: string, eventName: string) {
  switch (type) {
    case 'click': return createClickReport(appName, eventName);
    case 'load': return createLoadReport(appName, eventName);
    case 'navigation': return createNavigationReport(appName, eventName);
    // case 'memory': return createMemoryReport(appName, eventName);
    // case 'error': return createNavigationReport(appName, eventName);
    default: throw new UnreachableCaseError(type);
  }
}

// Click
// loaded
// createReport('navigation', 'canvas', 'main-page');
createReport('load', 'canvas', 'map-loaded');
// createReport('click', 'canvas', 'map-loaded');
// createReport('memory', 'canvas', 'some-flyout');
