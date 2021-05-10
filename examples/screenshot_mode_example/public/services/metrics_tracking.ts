/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { PLUGIN_NAME } from '../../common';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';

export class MetricsTracking {
  private trackingDisabled = false;

  constructor(private readonly usageCollection: UsageCollectionSetup) {}

  private track(eventName: string, type: METRIC_TYPE) {
    if (this.trackingDisabled) return;

    this.usageCollection.reportUiCounter(PLUGIN_NAME, type, eventName);
  }

  public setup({ disableTracking }: { disableTracking?: boolean }) {
    if (disableTracking) this.trackingDisabled = true;
  }

  public trackInit() {
    this.track('init', METRIC_TYPE.LOADED);
  }
}
