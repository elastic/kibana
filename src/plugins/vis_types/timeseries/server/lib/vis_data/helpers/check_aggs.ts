/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggNotSupportedError } from '../../../../common/errors';
import { isMetricEnabled } from '../../../../common/check_ui_restrictions';

import type { Metric } from '../../../../common/types';
import type { SearchCapabilities } from '../../search_strategies';

export function isAggSupported(metrics: Metric[], capabilities: SearchCapabilities) {
  const metricTypes = metrics.filter(
    (metric) => !isMetricEnabled(metric.type, capabilities.uiRestrictions)
  );

  if (metricTypes.length) {
    throw new AggNotSupportedError(metricTypes.map((metric) => `"${metric.type}"`).join(', '));
  }
}
