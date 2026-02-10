/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { takeSnapshot } from '../../snapshots/take_snapshot';
import type { MigrationInfoRecord, MigrationSnapshot } from '../../types';
import { TEST_TYPES } from './types';

const BASELINE_SNAPSHOT_PATH = resolve(__dirname, './baseline_snapshot.json');

/**
 * Refreshes computed hashes in `baseline_snapshot.json` while preserving
 * the hand-designed "before" state structure.
 *
 * Hashes are derived from `@kbn/config-schema` objects whose serialization
 * depends on transitive dependencies (e.g. `joi`). When those dependencies
 * are updated, the hashes drift and the CI `Check Saved Objects` test-mode
 * fallback fails with a "modelVersions have been updated" false positive.
 *
 * This function:
 * 1. Loads the existing baseline (preserving its structure: which types,
 *    which model versions, mappings, etc.).
 * 2. Takes a fresh snapshot of `TEST_TYPES` to compute current hashes.
 * 3. Patches only the hash-dependent fields (`hash`, `modelVersionHash`,
 *    `schemas`) in the baseline from the fresh snapshot.
 * 4. Writes the updated baseline back to disk.
 */
export const updateBaselineHashes = async (): Promise<{ updated: string[]; path: string }> => {
  const baseline: MigrationSnapshot = JSON.parse(
    readFileSync(BASELINE_SNAPSHOT_PATH, { encoding: 'utf-8' })
  );
  const freshSnapshot = await takeSnapshot(TEST_TYPES);
  const updated: string[] = [];

  for (const [typeName, baselineType] of Object.entries(baseline.typeDefinitions)) {
    const freshType: MigrationInfoRecord | undefined = freshSnapshot.typeDefinitions[typeName];

    if (!freshType) {
      continue;
    }

    let typeUpdated = false;

    // Refresh the top-level type `hash` (from `getMigrationHash`).
    if (baselineType.hash !== freshType.hash) {
      baselineType.hash = freshType.hash;
      typeUpdated = true;
    }

    // Refresh hashes inside each model version present in the baseline.
    for (const baselineMV of baselineType.modelVersions) {
      const freshMV = freshType.modelVersions.find((mv) => mv.version === baselineMV.version);

      if (!freshMV) {
        continue;
      }

      if (baselineMV.modelVersionHash !== freshMV.modelVersionHash) {
        baselineMV.modelVersionHash = freshMV.modelVersionHash;
        typeUpdated = true;
      }

      if (
        baselineMV.schemas.forwardCompatibility !== freshMV.schemas.forwardCompatibility ||
        baselineMV.schemas.create !== freshMV.schemas.create
      ) {
        baselineMV.schemas = { ...freshMV.schemas };
        typeUpdated = true;
      }
    }

    if (typeUpdated) {
      updated.push(typeName);
    }
  }

  writeFileSync(BASELINE_SNAPSHOT_PATH, JSON.stringify(baseline, null, 2) + '\n');

  return { updated, path: BASELINE_SNAPSHOT_PATH };
};
