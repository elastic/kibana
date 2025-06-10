/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import { createStats, cleanSavedObjectIndices } from '../lib';

export async function emptyKibanaIndexAction({ client, log }: { client: Client; log: ToolingLog }) {
  const stats = createStats('emptyKibanaIndex', log);

  await cleanSavedObjectIndices({ client, stats, log });
  // Refresh indices to prevent a race condition between a write and subsequent read operation. To
  // fix it deterministically we have to refresh saved object indices and wait until it's done.
  await client.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES, ignore_unavailable: true });

  // Additionally, we need to clear the cache to ensure that the next read operation will
  // not return stale data.
  await client.indices.clearCache({ index: ALL_SAVED_OBJECT_INDICES, ignore_unavailable: true });

  return stats.toJSON();
}
