/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { MigrationSnapshot } from '../types';
import { fetchSnapshotFromGCSBucket } from '../util/gcs';

export async function fetchSnapshot({
  log,
  gitRev,
}: {
  log: ToolingLog;
  gitRev: string;
}): Promise<MigrationSnapshot> {
  log.info(`Obtanining snapshot for baseline '${gitRev}'`);
  let attempts = 0;
  do {
    try {
      return await fetchSnapshotFromGCSBucket({ gitRev, log });
    } catch (err) {
      if (++attempts === 5) {
        log.error(`Failed to fetch snapshot after ${attempts} attempts`);
        log.error(err);
        throw err;
      } else {
        log.warning(`Failed to fetch snapshot (attempt #${attempts})`);
        log.warning(err);
      }

      if (err === 'Not Found') {
        // get parent commit SHA, to see if it has a snapshot
        log.warning(`Snapshot not found for SHA ${gitRev}.`);
        throw err;
      }
    }
  } while (true);
}
