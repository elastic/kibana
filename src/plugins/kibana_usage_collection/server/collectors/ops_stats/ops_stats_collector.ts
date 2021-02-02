/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { cloneDeep, omit } from 'lodash';
import moment from 'moment';
import { OpsMetrics } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
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
