/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { startsWith } from 'lodash';
import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { toPercentileNumber } from '../../../../common/to_percentile_number';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import type { Metric } from '../../../../common/types';

const percentileTest = /\[[0-9\.]+\]$/;

export const getBucketsPath = (id: string, metrics: Metric[]) => {
  const metric = metrics.find((m) => startsWith(id, m.id));
  let bucketsPath = String(id);

  if (metric) {
    switch (metric.type) {
      case METRIC_TYPES.DERIVATIVE:
        bucketsPath += '[normalized_value]';
        break;
      // For percentiles we need to breakout the percentile key that the user
      // specified. This information is stored in the key using the following pattern
      // {metric.id}[{percentile}]
      case TSVB_METRIC_TYPES.PERCENTILE:
        if (percentileTest.test(bucketsPath)) break;
        if (metric.percentiles?.length) {
          const percent = metric.percentiles[0];

          bucketsPath += `[${toPercentileNumber(percent.value!)}]`;
        }
        break;
      case TSVB_METRIC_TYPES.PERCENTILE_RANK:
        if (percentileTest.test(bucketsPath)) break;
        bucketsPath += `[${toPercentileNumber(metric.value!)}]`;
        break;
      case TSVB_METRIC_TYPES.STD_DEVIATION:
      case TSVB_METRIC_TYPES.VARIANCE:
      case TSVB_METRIC_TYPES.SUM_OF_SQUARES:
        if (/^std_deviation/.test(metric.type) && ['upper', 'lower'].includes(metric.mode!)) {
          bucketsPath += `[std_${metric.mode}]`;
        } else {
          bucketsPath += `[${metric.type}]`;
        }
        break;
    }
  }

  return bucketsPath;
};
