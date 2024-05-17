/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildProcessorFunction } from '../build_processor_function';
import {
  applyFilters,
  dateHistogram,
  filterRatios,
  metricBuckets,
  normalizeQuery,
  pivot,
  positiveRate,
  query,
  siblingBuckets,
  splitByTerms,
} from '../request_processors/table';

import type {
  TableRequestProcessorsFunction,
  TableRequestProcessorsParams,
  TableSearchRequest,
} from '../request_processors/table/types';

export function buildTableRequest(params: TableRequestProcessorsParams) {
  const processor = buildProcessorFunction<
    TableRequestProcessorsFunction,
    TableRequestProcessorsParams,
    TableSearchRequest
  >(
    [
      query,
      pivot,
      splitByTerms,
      dateHistogram,
      metricBuckets,
      siblingBuckets,
      filterRatios,
      positiveRate,
      applyFilters,
      normalizeQuery,
    ],
    params
  );

  return processor({});
}
