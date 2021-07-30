/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggNotSupportedInMode } from '../../../../common/errors';
import { PARENT_PIPELINE_AGGREGATIONS, TIME_RANGE_DATA_MODES } from '../../../../common/enums';
import { Metric } from '../../../../common/types';

export function isAggSupported(metrics: Metric[]) {
  const parentPipelineAggs = Object.values<string>(PARENT_PIPELINE_AGGREGATIONS);
  const metricTypes = metrics.filter(
    (metric) => parentPipelineAggs.includes(metric.type) || metric.type === 'series_agg'
  );

  if (metricTypes.length) {
    throw new AggNotSupportedInMode(
      metricTypes.map((metric) => metric.type).join(', '),
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE
    );
  }
}
