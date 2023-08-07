/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import { createStats, cleanSavedObjectIndices } from '../lib';

export async function emptyKibanaIndexAction({ client, log }: { client: Client; log: ToolingLog }) {
  const stats = createStats('emptyKibanaIndex', log);

  await cleanSavedObjectIndices({ client, stats, log });
  await client.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

  return stats.toJSON();
}
