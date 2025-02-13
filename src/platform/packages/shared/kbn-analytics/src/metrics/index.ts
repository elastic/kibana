/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiCounterMetric } from './ui_counter';
import type { UserAgentMetric } from './user_agent';
import type { ApplicationUsageMetric } from './application_usage';

// Export types separately to the actual run-time objects
export type { ApplicationUsageMetric } from './application_usage';
export type { UiCounterMetric, UiCounterMetricType } from './ui_counter';

export { createUiCounterMetric } from './ui_counter';
export { trackUsageAgent } from './user_agent';
export { createApplicationUsageMetric } from './application_usage';

export type Metric = UiCounterMetric | UserAgentMetric | ApplicationUsageMetric;
export enum METRIC_TYPE {
  COUNT = 'count',
  LOADED = 'loaded',
  CLICK = 'click',
  USER_AGENT = 'user_agent',
  APPLICATION_USAGE = 'application_usage',
}
