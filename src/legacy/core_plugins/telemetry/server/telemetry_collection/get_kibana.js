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

import { get, omit } from 'lodash';

export function handleKibanaStats(server, response) {
  if (!response) {
    server.log(
      ['warning', 'telemetry', 'local-stats'],
      'No Kibana stats returned from usage collectors'
    );
    return;
  }

  const { kibana, kibana_stats: kibanaStats, ...plugins } = response;

  const platform = get(kibanaStats, 'os.platform', 'unknown');
  const platformRelease = get(kibanaStats, 'os.platformRelease', 'unknown');

  const version = server
    .config()
    .get('pkg.version')
    .replace(/-snapshot/i, '');

  // combine core stats (os types, saved objects) with plugin usage stats
  // organize the object into the same format as monitoring-enabled telemetry
  return {
    ...omit(kibana, 'index'), // discard index
    count: 1,
    indices: 1,
    os: {
      platforms: [{ platform, count: 1 }],
      platformReleases: [{ platformRelease, count: 1 }],
    },
    versions: [{ version, count: 1 }],
    plugins,
  };
}

/*
 * Check user privileges for read access to monitoring
 * Pass callWithInternalUser to bulkFetchUsage
 */
export async function getKibana(server, callWithInternalUser) {
  const { collectorSet } = server.usage;
  const usage = await collectorSet.bulkFetch(callWithInternalUser);
  return collectorSet.toObject(usage);
}
