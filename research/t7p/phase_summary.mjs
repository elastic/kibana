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
