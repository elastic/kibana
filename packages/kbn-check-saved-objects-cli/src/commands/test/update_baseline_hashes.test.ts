/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { updateBaselineHashes } from './update_baseline_hashes';

/**
 * Utility to refresh computed hashes in `baseline_snapshot.json`.
 *
 * Run when transitive dependency changes (e.g. `joi`) cause the
 * `Check Saved Objects` CI step to fail with a false positive like:
 *
 *   "Some modelVersions have been updated for SO type 'person-so-type'
 *    after they were defined: 10.1.0."
 *
 * Usage:
 *   yarn test:jest packages/kbn-check-saved-objects-cli/src/commands/test/update_baseline_hashes.test.ts
 */
it('updates baseline_snapshot.json hashes', async () => {
  const { updated, path } = await updateBaselineHashes();

  if (updated.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`✅ baseline_snapshot.json is already up to date — no hashes changed.`);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `✅ Updated hashes for ${updated.length} type(s) in baseline_snapshot.json: ${updated.join(
        ', '
      )}\n` + `   File: ${path}`
    );
  }
});
