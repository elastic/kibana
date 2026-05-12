/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentRt, indexLifecyclePhaseRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, probabilityRt } from '../../default_api_types';

export interface StorageExplorerSummaryStatisticsResponse {
  tracesPerMinute: number;
  totalSize: number;
  diskSpaceUsedPct: number;
  numberOfServices: number;
  estimatedIncrementalSize: number;
  dailyDataGeneration: number;
}

export const storageExplorerSummaryStatsRoute =
  defineRoute<StorageExplorerSummaryStatisticsResponse>()({
    endpoint: 'GET /internal/apm/storage_explorer_summary_stats',
    params: t.type({
      query: t.intersection([
        indexLifecyclePhaseRt,
        probabilityRt,
        environmentRt,
        kueryRt,
        rangeRt,
      ]),
    }),
  });
