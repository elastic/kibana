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
import type { MigrationSnapshot } from './types';
import { getFixtures } from './migrations';

interface CheckSavedObjectsParams {
  gitRev: string;
  log: ToolingLog;
  fix?: boolean;
}

export async function checkSavedObjects({ gitRev, log, fix }: CheckSavedObjectsParams) {
  const serverHandles = await startServers(log);

  try {
    const [from, to] = await Promise.all([
      fetchSnapshot({ gitRev, log }),
      takeSnapshot({ log, serverHandles }),
    ]);

    const updatedTypes = assertValidUpdates({ from, to, log });

    // ensures that each of the updated types defines fixtures that allow testing the new modelVersions
    await getFixtures({ snapshot: to, serverHandles, types: updatedTypes, fix, log });

    // TODO use the @kbn/migrator-test-kit to test migrations forwards and backwards
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
  currentVersionSnapshot: MigrationSnapshot;
  baselines: string[];
  log: ToolingLog;
}

export async function assertValidUpdatesFromBaseline({
  currentVersionSnapshot,
  baselines,
  log,
}: AssertValidUpdatesFromBaselinesParams): Promise<string[]> {
  const updatedTypesPerBaseline = await Promise.all(
    baselines.map(async (gitRev) => {
      const from = await fetchSnapshot({ gitRev, log });
      return assertValidUpdates({ from, to: currentVersionSnapshot, log });
    })
  );

  return Array.from(new Set(updatedTypesPerBaseline.flat())).sort();
}
