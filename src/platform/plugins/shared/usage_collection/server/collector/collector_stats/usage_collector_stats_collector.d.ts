/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICollectorSet } from '../types';
export interface CollectorsStats {
  not_ready: {
    count: number;
    names: string[];
  };
  not_ready_timeout: {
    count: number;
    names: string[];
  };
  succeeded: {
    count: number;
    names: string[];
  };
  failed: {
    count: number;
    names: string[];
  };
  total_duration: number;
  total_is_ready_duration: number;
  total_fetch_duration: number;
  is_ready_duration_breakdown: Array<{
    name: string;
    duration: number;
  }>;
  fetch_duration_breakdown: Array<{
    name: string;
    duration: number;
  }>;
}
export interface CollectorsStatsCollectorParams {
  nonReadyCollectorTypes: string[];
  timedOutCollectorsTypes: string[];
  isReadyExecutionDurationByType: Array<{
    duration: number;
    type: string;
  }>;
  fetchExecutionDurationByType: Array<{
    duration: number;
    type: string;
    status: 'failed' | 'success';
  }>;
}
export declare const usageCollectorsStatsCollector: (
  usageCollection: Pick<ICollectorSet, 'makeUsageCollector'>,
  {
    nonReadyCollectorTypes,
    timedOutCollectorsTypes,
    isReadyExecutionDurationByType,
    fetchExecutionDurationByType,
  }: CollectorsStatsCollectorParams
) => import('../types').ICollector<CollectorsStats, {}>;
