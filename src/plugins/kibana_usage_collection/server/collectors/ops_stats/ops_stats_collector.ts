/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';
import { cloneDeep } from 'lodash';
import moment from 'moment';
import { OpsMetrics } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { KIBANA_STATS_TYPE } from '../../../common/constants';

interface OpsStatsMetrics extends Omit<OpsMetrics, 'response_times'> {
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
    delete metrics.process.pid;
    const responseTimes = {
      average: metrics.response_times.avg_in_millis,
      max: metrics.response_times.max_in_millis,
    };
    delete metrics.requests.statusCodes;
    lastMetrics = {
      ...metrics,
      response_times: responseTimes,
      timestamp: moment.utc().toISOString(),
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
