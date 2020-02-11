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

import { StatsGetter } from '../collection_manager';
import { getLocalStats, TelemetryLocalStats } from './get_local_stats';
import { getXPackLicense, getXPackUsage, ESLicense } from './get_xpack';

export type TelemetryAggregatedStats = TelemetryLocalStats & {
  license?: ESLicense;
  stack_stats: { xpack?: object };
};

export const getAggregatedStats: StatsGetter<TelemetryAggregatedStats> = async function(
  clustersDetails,
  config
) {
  const { callCluster } = config;
  const clustersLocalStats = await getLocalStats(clustersDetails, config);
  const license = await getXPackLicense(callCluster);
  const xpack = await getXPackUsage(callCluster).catch(() => undefined); // We want to still report something even when this method fails.

  return clustersLocalStats.map(localStats => {
    if (license) {
      if (!xpack) {
        throw new Error(`It has a license but no xpack usage!`);
      }
      return {
        ...localStats,
        license,
        stack_stats: { ...localStats.stack_stats, xpack },
      };
    }

    return localStats;
  });
};
