/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { startsWith } from 'lodash';
import { toPercentileNumber } from '../../../../common/to_percentile_number';
import { METRIC_TYPES } from '../../../../common/metric_types';

const percentileTest = /\[[0-9\.]+\]$/;

export const getBucketsPath = (id, metrics) => {
  const metric = metrics.find((m) => startsWith(id, m.id));
  let bucketsPath = String(id);

  switch (metric.type) {
    case METRIC_TYPES.DERIVATIVE:
      bucketsPath += '[normalized_value]';
      break;
    // For percentiles we need to breakout the percentile key that the user
    // specified. This information is stored in the key using the following pattern
    // {metric.id}[{percentile}]
    case METRIC_TYPES.PERCENTILE:
      if (percentileTest.test(bucketsPath)) break;
      const percent = metric.percentiles[0];
      bucketsPath += `[${toPercentileNumber(percent.value)}]`;
      break;
    case METRIC_TYPES.PERCENTILE_RANK:
      if (percentileTest.test(bucketsPath)) break;
      bucketsPath += `[${toPercentileNumber(metric.value)}]`;
      break;
    case METRIC_TYPES.STD_DEVIATION:
    case METRIC_TYPES.VARIANCE:
    case METRIC_TYPES.SUM_OF_SQUARES:
      if (/^std_deviation/.test(metric.type) && ~['upper', 'lower'].indexOf(metric.mode)) {
        bucketsPath += `[std_${metric.mode}]`;
      } else {
        bucketsPath += `[${metric.type}]`;
      }
      break;
  }

  return bucketsPath;
};
