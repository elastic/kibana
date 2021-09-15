/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggNotSupportedInMode } from '../../../../common/errors';
import { getAggsByType, AGG_TYPE } from '../../../../common/agg_utils';
import { TSVB_METRIC_TYPES, TIME_RANGE_DATA_MODES } from '../../../../common/enums';
import { Metric } from '../../../../common/types';

export function isAggSupported(metrics: Metric[]) {
  const parentPipelineAggs = getAggsByType<string>((agg) => agg.id)[AGG_TYPE.PARENT_PIPELINE];
  const metricTypes = metrics.filter(
    (metric) =>
      parentPipelineAggs.includes(metric.type) || metric.type === TSVB_METRIC_TYPES.SERIES_AGG
  );

  if (metricTypes.length) {
    throw new AggNotSupportedInMode(
      metricTypes.map((metric) => metric.type).join(', '),
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE
    );
  }
}
