/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildProcessorFunction } from '../build_processor_function';
import {
  percentile,
  percentileRank,
  stdMetric,
  stdSibling,
  math,
  seriesAgg,
  dropLastBucketFn,
} from '../response_processors/table';

import type {
  TableResponseProcessorsFunction,
  TableResponseProcessorsParams,
  TableSearchResponse,
} from '../response_processors/table/types';

export function buildTableResponse(params: TableResponseProcessorsParams) {
  const processor = buildProcessorFunction<
    TableResponseProcessorsFunction,
    TableResponseProcessorsParams,
    TableSearchResponse
  >([percentile, percentileRank, stdMetric, stdSibling, math, seriesAgg, dropLastBucketFn], params);

  return processor([]);
}
