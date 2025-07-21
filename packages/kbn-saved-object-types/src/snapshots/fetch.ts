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
import { safeExec } from '../exec';
import { fetchSnapshotFromGCSBucket } from '../gcs';
import { getCurrentQARelease } from '../util/serverless';

export async function fetchLatestBaseBranchSnapshot({
  log,
  baseBranch,
}: {
  log: ToolingLog;
  baseBranch: string;
}): Promise<MigrationSnapshot> {
  let attempts = 0;
  // fetch the most recent common ancestor between current commit and base branch
  let gitRev = await safeExec(`git merge-base --fork-point ${baseBranch}`, log);
  log.info(`✅ Determined common parent SHA (base branch '${baseBranch}'): ${gitRev}`);
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
        log.warning(`Snapshot not found for SHA ${gitRev}`);
        gitRev = await safeExec(`git log --pretty=%P -n 1 "${gitRev}"`, log);
        log.info(`✅ Using parent commit ${gitRev}`);
      }
    }
  } while (true);
}

export async function fetchLatestServerlessSnapshot({
  log,
}: {
  log: ToolingLog;
}): Promise<MigrationSnapshot> {
  let attempts = 0;

  const gitRev = await getCurrentQARelease({ log });
  log.debug(`Determined current QA serverless release commit: ${gitRev}`);

  do {
    try {
      return await fetchSnapshotFromGCSBucket({ gitRev, log });
    } catch (err) {
      if (err?.message.includes(`Couldn't expand git rev: ${gitRev}`)) {
        log.error(
          `Your local copy of the repository is older than previous serverless release, please pull the latest changes and rebase to allow SO migrations compatibility checks.`
        );
        throw err;
      }
      if (++attempts === 3) {
        log.error(`Failed to fetch snapshot after ${attempts} attempts`);
        log.error(err);
        throw err;
      } else {
        log.warning(`Failed to fetch snapshot (attempt #${attempts})`);
        log.warning(err);
      }
    }
  } while (true);
}
