/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { MetricsTracker } from '../types';
import { UsageCollectionSetup } from '../../../usage_collection/public';

const APP_TRACKER_NAME = 'console';

export const createUsageTracker = (usageCollection?: UsageCollectionSetup): MetricsTracker => {
  const track = (type: UiCounterMetricType, name: string) =>
    usageCollection?.reportUiCounter(APP_TRACKER_NAME, type, name);

  return {
    count: (eventName: string) => {
      track(METRIC_TYPE.COUNT, eventName);
    },
    load: (eventName: string) => {
      track(METRIC_TYPE.LOADED, eventName);
    },
  };
};
