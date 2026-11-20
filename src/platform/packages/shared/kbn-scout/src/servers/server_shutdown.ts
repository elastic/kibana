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

const SHUTDOWN_TIMEOUT_MS = 2 * 60 * 1000;

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
  shutdownEs: () => Promise<void>
): (() => void) => {
  const removeShutdownHook = asyncExitHook(() => shutdownServers(procs, shutdownEs), {
    wait: SHUTDOWN_TIMEOUT_MS,
  });

  // exit-hook listens with `once`. Keep another listener after it fires so execa's signal-exit
  // does not re-raise SIGTERM/SIGINT before the asynchronous shutdown completes. A second signal
  // means the user does not want to wait for it (a hung docker daemon, a slow cluster stop):
  // exit right away, like the default signal handling would.
  let signals = 0;
  const keepSignalListener = (signal: NodeJS.Signals) => {
    signals += 1;
    if (signals > 1) {
      process.stderr.write(
        `\nReceived ${signal} again, exiting without waiting for the shutdown\n`
      );
      process.exit(signal === 'SIGINT' ? 130 : 143);
    }
  };
  process.on('SIGTERM', keepSignalListener);
  process.on('SIGINT', keepSignalListener);

  return () => {
    removeShutdownHook();
    process.off('SIGTERM', keepSignalListener);
    process.off('SIGINT', keepSignalListener);
  };
};
