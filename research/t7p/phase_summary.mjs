/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Roll a warm-dispatch sample into the five phases shared with 7.B. No I/O. */

/**
 * Partition one client round trip.
 * Replica snapshot/refresh includes the run path's second decode.
 * Parity/definition checks are the saved-object readiness hash plus task-definition diff.
 * Boot body is the historical boot probe: re-entry, one decode, replica apply, readiness.
 */
export const rollupDispatchPhases = (sample) => {
  const islandReentryMs = sample.islandReentryMs;
  const replicaSnapshotRefreshMs =
    sample.snapshotDecodeMs + sample.secondDecodeMs + sample.replicaRefreshMs;
  const parityDefinitionChecksMs = sample.readinessMs + sample.definitionParityMs;
  const workloadSetupMs = sample.workloadSetupMs;
  const workerAccountedMs =
    islandReentryMs + replicaSnapshotRefreshMs + parityDefinitionChecksMs + workloadSetupMs;
  return {
    transportMs: sample.clientMs - sample.workerTotalMs,
    replicaSnapshotRefreshMs,
    parityDefinitionChecksMs,
    islandReentryMs,
    workloadSetupMs,
    bootBodyMs:
      sample.islandReentryMs +
      sample.snapshotDecodeMs +
      sample.replicaRefreshMs +
      sample.readinessMs,
    unaccountedWorkerMs: sample.workerTotalMs - workerAccountedMs,
  };
};
