/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { ToolingLog } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';

import { migrateKibanaIndex, createStats, cleanKibanaIndices } from '../lib';

export async function emptyKibanaIndexAction({
  client,
  log,
  kbnClient,
}: {
  client: KibanaClient;
  log: ToolingLog;
  kbnClient: KbnClient;
}) {
  const stats = createStats('emptyKibanaIndex', log);

  await cleanKibanaIndices({ client, stats, log });
  await migrateKibanaIndex(kbnClient);
  stats.createdIndex('.kibana');
  return stats.toJSON();
}
