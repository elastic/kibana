/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { cloneDeep, omit } from 'lodash';
import moment from 'moment';
import { OpsMetrics } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { KIBANA_STATS_TYPE } from '../../../common/constants';
interface OpsStatsMetrics extends Omit<OpsMetrics, 'response_times' | 'collected_at'> {
  timestamp: string;
  response_times: {
    average: number;
    max: number;
  };
}

/**
 * Initialize a collector for Kibana Ops Stats
 */
export function getOpsStatsCollector(
  usageCollection: UsageCollectionSetup,
  metrics$: Observable<OpsMetrics>
) {
  let lastMetrics: OpsStatsMetrics | null = null;
  metrics$.subscribe((_metrics) => {
    const metrics = cloneDeep(_metrics);
    // Ensure we only include the same data that Metricbeat collection would get
    // @ts-expect-error
    delete metrics.process.pid;
    for (const process of metrics.processes) {
      // @ts-expect-error
      delete process.pid;
    }

    const responseTimes = {
      average: metrics.response_times.avg_in_millis,
      max: metrics.response_times.max_in_millis,
    };
    // @ts-expect-error
    delete metrics.requests.statusCodes;
    lastMetrics = {
      ...omit(metrics, ['collected_at']),
      response_times: responseTimes,
      timestamp: moment.utc(metrics.collected_at).toISOString(),
    };
  });

  return usageCollection.makeStatsCollector({
    type: KIBANA_STATS_TYPE,
    isReady: () => !!lastMetrics,
    fetch: () => lastMetrics,
  });
}

export function registerOpsStatsCollector(
  usageCollection: UsageCollectionSetup,
  metrics$: Observable<OpsMetrics>
) {
  usageCollection.registerCollector(getOpsStatsCollector(usageCollection, metrics$));
}
