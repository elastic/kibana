/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { ToolingLog } from '@kbn/dev-utils';
import { createStats, cleanMonitoringIndices } from '../lib';

export async function emptyMonitoringIndexAction({
  client,
  log,
}: {
  client: KibanaClient;
  log: ToolingLog;
}) {
  const stats = createStats('emptyMonitoringIndex', log);

  await cleanMonitoringIndices({ client, stats, log });

  return stats.toJSON();
}
