/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import type { Logger } from '@kbn/logging';

/** @internal */
export interface FatalExitLogging {
  /**
   * Flags that the reason for terminating has already been reported, so that the
   * `exit` guard stays silent for shutdowns going through `Root.shutdown()`.
   */
  markShutdownReasonReported: () => void;
  unregister: () => void;
}

interface RegisterFatalExitLoggingDeps {
  logger: Logger;
}

const fatalTag = () => chalk.white.bgRed(' FATAL ');

/**
 * Logs terminations that don't go through `Root.shutdown()`, such as an exception thrown from a
 * timer or event callback, or a `process.exit()` called from outside the root shutdown path.
 *
 * Terminations that give us no chance to run any code (`SIGKILL`, the OOM killer,
 * `process.abort()`) cannot be reported here.
 *
 * @internal
 */
export const registerFatalExitLogging = ({
  logger,
}: RegisterFatalExitLoggingDeps): FatalExitLogging => {
  let shutdownReasonReported = false;

  const onUncaughtExceptionMonitor = (error: Error, origin: string) => {
    shutdownReasonReported = true;
    const message = `Kibana is shutting down due to an ${origin}`;

    try {
      logger.fatal(message, { error });
    } catch {
      // The logging system itself may be the thing that broke, so the stderr mirror below
      // has to run regardless.
    }

    // Appenders are not guaranteed to flush before the process dies, so always mirror to stderr.
    // eslint-disable-next-line no-console
    console.error(`\n${fatalTag()} ${message}: ${error?.stack ?? JSON.stringify(error)}\n`);
  };

  const onExit = (code: number) => {
    if (code === 0 || shutdownReasonReported) {
      return;
    }

    // Only synchronous work runs at this point, so the logger cannot be used.
    // eslint-disable-next-line no-console
    console.error(
      `\n${fatalTag()} Kibana is shutting down unexpectedly with exit code ${code}, without reporting a reason\n`
    );
  };

  process.on('uncaughtExceptionMonitor', onUncaughtExceptionMonitor);
  process.on('exit', onExit);

  return {
    markShutdownReasonReported: () => {
      shutdownReasonReported = true;
    },
    unregister: () => {
      process.off('uncaughtExceptionMonitor', onUncaughtExceptionMonitor);
      process.off('exit', onExit);
    },
  };
};
