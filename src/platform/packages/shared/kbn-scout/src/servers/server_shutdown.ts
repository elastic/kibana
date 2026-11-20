/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcRunner } from '@kbn/dev-proc-runner';
import { asyncExitHook } from 'exit-hook';

// Above the Elasticsearch ready timeout (2 minutes): a shutdown that starts during the
// Elasticsearch boot waits for that boot to settle before stopping it, and the forced exit must
// not land first. A second signal exits right away for whoever does not want to wait.
const SHUTDOWN_TIMEOUT_MS = 5 * 60 * 1000;

export const shutdownServers = async (
  procs: Pick<ProcRunner, 'teardown'>,
  shutdownEs: () => Promise<void>
): Promise<void> => {
  try {
    await procs.teardown();
  } finally {
    await shutdownEs();
  }
};

/** Holds process exit until both managed processes and Elasticsearch stop. */
export const registerServerShutdown = (
  procs: Pick<ProcRunner, 'teardown'>,
  shutdownEs: () => Promise<void>,
  /** Runs as soon as the signal is handled, before any teardown starts. */
  onSignal?: () => void
): (() => void) => {
  const removeShutdownHook = asyncExitHook(
    () => {
      onSignal?.();
      return shutdownServers(procs, shutdownEs);
    },
    { wait: SHUTDOWN_TIMEOUT_MS }
  );

  // exit-hook listens with `once`. Keep another listener after it fires so execa's signal-exit
  // does not re-raise SIGTERM/SIGINT before the asynchronous shutdown completes. The same signal
  // a second time means the user does not want to wait for it (a hung docker daemon, a slow
  // cluster stop): exit right away, like the default signal handling would. Only the same
  // signal: a SIGTERM followed by a SIGINT (a supervisor cancelling, then a user) is not a
  // request to leave containers behind.
  const signals: Partial<Record<NodeJS.Signals, number>> = {};
  const keepSignalListener = (signal: NodeJS.Signals) => {
    signals[signal] = (signals[signal] ?? 0) + 1;
    if (signals[signal] === 1) {
      process.stderr.write(
        `\nReceived ${signal}, shutting the servers down (send ${signal} again to exit without waiting)\n`
      );
      return;
    }
    process.stderr.write(`\nReceived ${signal} again, exiting without waiting for the shutdown\n`);
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.on('SIGTERM', keepSignalListener);
  process.on('SIGINT', keepSignalListener);

  return () => {
    removeShutdownHook();
    process.off('SIGTERM', keepSignalListener);
    process.off('SIGINT', keepSignalListener);
  };
};
