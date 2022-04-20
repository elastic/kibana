/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
// @ts-expect-error not typed yet
import { getAggValue } from './get_agg_value';
import type { Metric } from '../../../../common/types';
import type { PanelDataArray } from '../../../../common/types/vis_data';

export const mapEmptyToZero = (
  metric: Metric,
  buckets: Array<
    {
      key: number | string;
    } & Record<string, unknown>
  >
): PanelDataArray[] => {
  // Metric types where an empty set equals `zero`
  const isSettableToZero = [
    METRIC_TYPES.COUNT,
    METRIC_TYPES.CARDINALITY,
    METRIC_TYPES.SUM,
  ].includes(metric.type as METRIC_TYPES);

  return isSettableToZero && !buckets.length
    ? [[undefined, 0]]
    : buckets.map((bucket) => [bucket.key, getAggValue(bucket, metric)]);
};
