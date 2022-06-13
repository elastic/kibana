/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiCounterMetricType, METRIC_TYPE } from '@kbn/analytics';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { PLUGIN_NAME } from '../../common';

export class MetricsTracking {
  private trackingDisabled = false;
  private usageCollection?: UsageCollectionSetup;

  private track(eventName: string, type: UiCounterMetricType) {
    if (this.trackingDisabled) return;

    this.usageCollection?.reportUiCounter(PLUGIN_NAME, type, eventName);
  }

  public setup({
    disableTracking,
    usageCollection,
  }: {
    disableTracking?: boolean;
    usageCollection: UsageCollectionSetup;
  }) {
    this.usageCollection = usageCollection;
    if (disableTracking) this.trackingDisabled = true;
  }

  public trackInit() {
    this.track('init', METRIC_TYPE.LOADED);
  }
}
