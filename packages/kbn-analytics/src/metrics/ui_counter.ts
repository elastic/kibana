/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { METRIC_TYPE } from './';

export type UiCounterMetricType = METRIC_TYPE.CLICK | METRIC_TYPE.LOADED | METRIC_TYPE.COUNT;
export interface UiCounterMetricConfig {
  type: UiCounterMetricType;
  appName: string;
  eventName: string;
  count?: number;
}

export interface UiCounterMetric {
  type: UiCounterMetricType;
  appName: string;
  eventName: string;
  count: number;
}

export function createUiCounterMetric({
  type,
  appName,
  eventName,
  count = 1,
}: UiCounterMetricConfig): UiCounterMetric {
  return {
    type,
    appName,
    eventName,
    count,
  };
}
