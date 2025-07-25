/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { exit } from 'process';
import { fetchSnapshot, takeSnapshot, assertValidUpdates } from '../src/snapshots';

/**
 * Perform a series of sanity checks on the definitions of the saved object types for the current code level.
 * It attempts to download a couple of snapshots, to compare how these definitions have evolved:
 * - The current (latest) serverless release snapshot
 * - The base branch snapshot (if SHA provided and snapshot available)
 * @param gitRev The identifier of the reference commit SHA, aka the baseline for the comparison
 * @private
 */
export function checkSavedObjectTypes(gitRev: string) {
  run(async ({ log }) => {
    const baseline = await fetchSnapshot({ log, gitRev }).catch(() => {
      log.error('⚠️ Failed to download the baseline snapshot. Skipping Saved Objects checks.');
      exit(1);
    });

    const current = await takeSnapshot({ log }).catch(() => {
      log.error(
        '⚠️ Failed to obtain snapshot for current working tree. Skipping Saved Objects checks.'
      );
      exit(1);
    });

    await assertValidUpdates({ log, from: baseline, to: current }).catch(() => {
      log.error('❌ Found some violations in the current Saved Object definitions.');
      exit(1);
    });

    exit(0);
  });
}
