/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';

export const PARENT_PIPELINE_AGGS: string[] = [
  METRIC_TYPES.CUMULATIVE_SUM,
  METRIC_TYPES.DERIVATIVE,
  METRIC_TYPES.MOVING_FN,
];

export const SIBLING_PIPELINE_AGGS: string[] = [
  METRIC_TYPES.AVG_BUCKET,
  METRIC_TYPES.MAX_BUCKET,
  METRIC_TYPES.MIN_BUCKET,
  METRIC_TYPES.SUM_BUCKET,
];

export const PIPELINE_AGGS = [...PARENT_PIPELINE_AGGS, ...SIBLING_PIPELINE_AGGS];
