/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sumBy } from 'lodash';
import { collectorsStatsSchema } from './schema';
import type { CollectorSet } from '../collector_set';

export interface CollectorsStats {
  not_ready: { count: number; names: string[] };
  not_ready_timeout: { count: number; names: string[] };
  succeeded: { count: number; names: string[] };
  failed: { count: number; names: string[] };

  total_duration: number;
  total_is_ready_duration: number;
  total_fetch_duration: number;
  is_ready_duration_breakdown: Array<{ name: string; duration: number }>;
  fetch_duration_breakdown: Array<{ name: string; duration: number }>;
}

export interface CollectorsStatsCollectorParams {
  nonReadyCollectorTypes: string[];
  timedOutCollectorsTypes: string[];
  isReadyExecutionDurationByType: Array<{ duration: number; type: string }>;
  fetchExecutionDurationByType: Array<{
    duration: number;
    type: string;
    status: 'failed' | 'success';
  }>;
}

export const usageCollectorsStatsCollector = (
  usageCollection: Pick<CollectorSet, 'makeUsageCollector'>,
  {
    nonReadyCollectorTypes,
    timedOutCollectorsTypes,
    isReadyExecutionDurationByType,
    fetchExecutionDurationByType,
  }: CollectorsStatsCollectorParams
) => {
  return usageCollection.makeUsageCollector<CollectorsStats>({
    type: 'usage_collector_stats',
    isReady: () => true,
    schema: collectorsStatsSchema,
    fetch: () => {
      const totalIsReadyDuration = sumBy(isReadyExecutionDurationByType, 'duration');
      const totalFetchDuration = sumBy(fetchExecutionDurationByType, 'duration');

      const succeededCollectorTypes = fetchExecutionDurationByType
        .filter(({ status }) => status === 'success')
        .map(({ type }) => type);
      const failedCollectorTypes = fetchExecutionDurationByType
        .filter(({ status }) => status === 'failed')
        .map(({ type }) => type);

      const collectorsStats: CollectorsStats = {
        // isReady and fetch stats
        not_ready: { count: nonReadyCollectorTypes.length, names: nonReadyCollectorTypes },
        not_ready_timeout: {
          count: timedOutCollectorsTypes.length,
          names: timedOutCollectorsTypes,
        },
        succeeded: { count: succeededCollectorTypes.length, names: succeededCollectorTypes },
        failed: { count: failedCollectorTypes.length, names: failedCollectorTypes },

        // total durations
        total_is_ready_duration: totalIsReadyDuration,
        total_fetch_duration: totalFetchDuration,
        total_duration: totalIsReadyDuration + totalFetchDuration,

        // durations breakdown
        is_ready_duration_breakdown: isReadyExecutionDurationByType.map(
          ({ type: name, duration }) => ({ name, duration })
        ),
        fetch_duration_breakdown: fetchExecutionDurationByType.map(({ type: name, duration }) => ({
          name,
          duration,
        })),
      };

      return collectorsStats;
    },
  });
};
