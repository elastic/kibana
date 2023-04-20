/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';

import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import { migrateSavedObjectIndices, createStats, cleanSavedObjectIndices } from '../lib';

export async function emptyKibanaIndexAction({
  client,
  log,
  kbnClient,
}: {
  client: Client;
  log: ToolingLog;
  kbnClient: KbnClient;
}) {
  const stats = createStats('emptyKibanaIndex', log);

  await cleanSavedObjectIndices({ client, stats, log });
  await migrateSavedObjectIndices(kbnClient);
  ALL_SAVED_OBJECT_INDICES.forEach((indexPattern) => stats.createdIndex(indexPattern));
  return stats.toJSON();
}
