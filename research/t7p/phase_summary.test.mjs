/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { rollupDispatchPhases } from './phase_summary.mjs';

test('five phases partition the client round trip', () => {
  const rollup = rollupDispatchPhases({
    clientMs: 4200,
    workerTotalMs: 4170,
    islandReentryMs: 1,
    snapshotDecodeMs: 2000,
    secondDecodeMs: 1900,
    replicaRefreshMs: 4,
    readinessMs: 250,
    definitionParityMs: 5,
    workloadSetupMs: 10,
  });
  assert.equal(rollup.transportMs, 30);
  assert.equal(rollup.replicaSnapshotRefreshMs, 3904);
  assert.equal(rollup.parityDefinitionChecksMs, 255);
  assert.equal(rollup.islandReentryMs, 1);
  assert.equal(rollup.workloadSetupMs, 10);
  assert.equal(rollup.bootBodyMs, 2255);
  assert.equal(rollup.unaccountedWorkerMs, 0);
  const sum =
    rollup.transportMs +
    rollup.replicaSnapshotRefreshMs +
    rollup.parityDefinitionChecksMs +
    rollup.islandReentryMs +
    rollup.workloadSetupMs;
  assert.equal(sum, 4200);
});
