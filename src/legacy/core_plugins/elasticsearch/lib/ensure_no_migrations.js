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

import { migrationsUpToDate } from '../../../../server/saved_objects/migrations/core/elastic_index';

const THROTTLE_IN_MS = 30000; // 30 seconds

let lastWarningAt;

function throttledWarning(server) {
  const now = Date.now();

  if (lastWarningAt && (now - lastWarningAt) < THROTTLE_IN_MS) {
    return;
  }

  lastWarningAt = now;

  server.logWithMetadata(
    ['warning'],
    'The Kibana server has pending migrations and should be restarted. This is most likely ' +
    'caused by removing or manually updating the underlying Kibana index.'
  );
}

export async function ensureNoMigrations(plugin, server) {
  const kibanaIndex = server.config().get('kibana.index');
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');

  if (server.kibanaMigrator && server.kibanaMigrator.hasMigrated === true) {
    const { migrationVersion } = server.kibanaMigrator.documentMigrator;
    const upTodate = await migrationsUpToDate(callWithInternalUser, kibanaIndex, migrationVersion, 1);

    if (upTodate) {
      return;
    }

    throttledWarning(server);
  }
}
