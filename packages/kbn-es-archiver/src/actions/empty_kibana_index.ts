/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import type { ToolingLog } from '@kbn/dev-utils';

import { createStats, cleanSavedObjectIndices } from '../lib';
import { ALL_SAVED_OBJECT_INDICES } from '../lib/indices/constants';

export async function emptyKibanaIndexAction({
  client,
  log,
}: {
  client: KibanaClient;
  log: ToolingLog;
}) {
  const stats = createStats('emptyKibanaIndex', log);

  await cleanSavedObjectIndices({ client, stats, log });
  await client.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

  return stats.toJSON();
}
