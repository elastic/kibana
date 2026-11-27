/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiCounterMetricType } from '@kbn/analytics';
import type { UsageCounter } from '../services/usage_counters_api_service';
import { UI_COUNTERS_APP_NAME } from './constants';

export const createUiCounterEvent = (eventName: string, type: UiCounterMetricType, count = 1) => ({
  eventName,
  appName: UI_COUNTERS_APP_NAME,
  type,
  count,
});

export const uniqueEventName = (): string => {
  const hrTime = process.hrtime();
  const nano = hrTime[0] * 1000000000 + hrTime[1];
  return `my_event_${nano}`;
};

/** Reduces stored usage counters to their type and count, sorted by type. */
export const toTypeAndCount = (counters: UsageCounter[]) =>
  counters
    .map(({ attributes: { counterType, count } }) => ({ counterType, count }))
    .sort((a, b) => a.counterType.localeCompare(b.counterType));
