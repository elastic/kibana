/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { extractAndArchiveLogs } from '@kbn/es/src/utils';
import type { ICluster } from './test_es_cluster';

export async function cleanupElasticsearch(
  node: ICluster,
  isServerless: boolean,
  logsDir: string | undefined,
  log: ToolingLog
): Promise<void> {
  await node.cleanup();

  if (isServerless) {
    await extractAndArchiveLogs({ outputFolder: logsDir, log });
  }
}
