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

import { KIBANA_STATS_TYPE } from '../constants';
import { getKibanaInfoForStats } from '../lib';

/*
 * Initialize a collector for Kibana Ops Stats
 *
 * NOTE this collector's fetch method returns the latest stats from the
 * Hapi/Good/Even-Better ops event listener. Therefore, the stats reset
 * every 5 seconds (the default value of the ops.interval configuration
 * setting). That makes it geared for providing the latest "real-time"
 * stats. In the long-term, fetch should return stats that constantly
 * accumulate over the server's uptime for better machine readability.
 * Since the data is captured, timestamped and stored, the historical
 * data can provide "real-time" stats by calculating a derivative of
 * the metrics.
 * See PR comment in https://github.com/elastic/kibana/pull/20577/files#r202416647
 */
export function getOpsStatsCollector(server, kbnServer) {
  const { collectorSet } = server.usage;
  return collectorSet.makeStatsCollector({
    type: KIBANA_STATS_TYPE,
    fetch: () => {
      return {
        kibana: getKibanaInfoForStats(server, kbnServer),
        ...kbnServer.metrics, // latest metrics captured from the ops event listener in src/legacy/server/status/index
      };
    },
    isReady: () => true,
    ignoreForInternalUploader: true, // Ignore this one from internal uploader. A different stats collector is used there.
  });
}
