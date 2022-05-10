/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sumBy } from 'lodash';
import type { UsageCollectorOptions } from '../usage_collector';
import { schema } from './schema';

export interface CollectorsStats {
  not_ready: { count: number; names: string[] };
  not_ready_timeout: { count: number; names: string[] };
  succeeded: { count: number; names: string[] };
  failed: { count: number; names: string[] };

  total_duration: number;
  total_is_ready_duration: number;
  total_fetch_duration: number;
  is_ready_duration_breakdown: Record<string, number>;
  fetch_duration_breakdown: Record<string, number>;
}

export interface CollectorsStatsCollectorParams {
  nonReadyCollectorTypes: string[];
  timedOutCollectorsTypes: string[];
  isReadyExecutionDurationByType: Array<{ duration: number; type: string }>;

  fetchExecutions: Array<{ duration: number; type: string; status: 'failed' | 'success' }>;
}

export const usageCollectorsStatsCollector = ({
  // isReady stats
  nonReadyCollectorTypes,
  timedOutCollectorsTypes,
  isReadyExecutionDurationByType,

  // fetch and collector stats
  fetchExecutions,
}: CollectorsStatsCollectorParams): UsageCollectorOptions<CollectorsStats> => {
  return {
    type: 'usage_collector_stats',
    isReady: () => true,
    schema,
    fetch: () => {
      const totalIsReadyDuration = sumBy(isReadyExecutionDurationByType, 'duration');
      const totalFetchDuration = sumBy(fetchExecutions, 'duration');

      const succeededCollectorTypes = fetchExecutions
        .filter(({ status }) => status === 'success')
        .map(({ type }) => type);
      const failedCollectorTypes = fetchExecutions
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
        is_ready_duration_breakdown: isReadyExecutionDurationByType.reduce(
          (acc, { type, duration }) => {
            acc[type] = duration;
            return acc;
          },
          {} as Record<string, number>
        ),

        fetch_duration_breakdown: fetchExecutions.reduce((acc, { type, duration }) => {
          acc[type] = duration;
          return acc;
        }, {} as Record<string, number>),
      };

      return collectorsStats;
    },
  };
};
