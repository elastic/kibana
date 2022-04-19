/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiCounterMetricType, METRIC_TYPE } from '@kbn/analytics';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

export { METRIC_TYPE };

export let reportUiCounter: UsageCollectionSetup['reportUiCounter'] | undefined;

export function init(_reportUiCounter: UsageCollectionSetup['reportUiCounter']): void {
  reportUiCounter = _reportUiCounter;
}

export function trackUiMetric(metricType: UiCounterMetricType, name: string | string[]) {
  if (!reportUiCounter) {
    return;
  }

  reportUiCounter('kibana_overview', metricType, name);
}
