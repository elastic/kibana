/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UiCounterMetric } from './ui_counter';
import { UserAgentMetric } from './user_agent';
import { ApplicationUsageMetric } from './application_usage';

export { UiCounterMetric, createUiCounterMetric, UiCounterMetricType } from './ui_counter';
export { trackUsageAgent } from './user_agent';
export { createApplicationUsageMetric, ApplicationUsageMetric } from './application_usage';

export type Metric = UiCounterMetric | UserAgentMetric | ApplicationUsageMetric;
export enum METRIC_TYPE {
  COUNT = 'count',
  LOADED = 'loaded',
  CLICK = 'click',
  USER_AGENT = 'user_agent',
  APPLICATION_USAGE = 'application_usage',
}
