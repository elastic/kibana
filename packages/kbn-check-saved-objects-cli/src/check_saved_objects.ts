/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { startServers, stopServers } from './util/servers';
import { assertValidUpdates, fetchSnapshot, takeSnapshot } from './snapshots';

interface CheckSavedObjectsParams {
  shas: string[];
  log: ToolingLog;
}

export async function checkSavedObjects({ shas, log }: CheckSavedObjectsParams) {
  log.info(`Starting ES + Kibana to capture current SO type definitions`);
  const serverHandles = await startServers();

  try {
    await assertValidUpdatesFromBaselines({ serverHandles, baselines: shas, log });
  } finally {
    try {
      log.info(`Stopping ES + Kibana after the verifications`);
      await stopServers({ log, serverHandles });
    } catch (err) {
      log.warning(
        'There was a problem stopping the services used for the Saved Objects checks',
        err
      );
    }
  }
}

interface AssertValidUpdatesFromBaselinesParams {
  serverHandles: any;
  baselines: string[];
  log: ToolingLog;
}

export async function assertValidUpdatesFromBaselines({
  serverHandles,
  baselines,
  log,
}: AssertValidUpdatesFromBaselinesParams): Promise<void> {
  const current = await takeSnapshot({ log, serverHandles });

  await Promise.all(
    baselines.map(async (gitRev) => {
      const from = await fetchSnapshot({ gitRev, log });
      assertValidUpdates({ from, to: current, log });
    })
  );
}
