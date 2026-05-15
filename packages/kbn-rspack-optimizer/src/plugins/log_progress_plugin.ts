/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rspack, type Compiler, type RspackPluginInstance } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Global shutdown flag - when set to true, RSPack logging will stop immediately.
 * This is used to prevent log output after Ctrl+C while RSPack finishes its current work.
 */
let isShuttingDown = false;

/**
 * Signal the RSPack optimizer to stop all logging immediately.
 * Call this when SIGINT/SIGTERM is received.
 */
export function signalShutdown(): void {
  isShuttingDown = true;
}

/**
 * Reset the shutdown flag (for testing or restart scenarios).
 */
export function resetShutdown(): void {
  isShuttingDown = false;
}

/**
 * Create a log-based progress plugin that doesn't use dynamic terminal updates.
 * This avoids terminal state issues when pressing Ctrl+C.
 *
 * Logging strategy:
 * - Logs at 10% intervals
 * - Also logs if 10+ seconds have passed (never wait too long)
 * - Shows current stage (building, sealing, emitting, etc.)
 * - Shows elapsed time
 * - Immediately stops logging when shutdown is signaled
 *
 * @param log - ToolingLog instance for consistent formatting with Kibana's dev mode
 */
export function createLogProgressPlugin(log?: ToolingLog): RspackPluginInstance {
  let lastLoggedPercent = -5;
  let lastLogTime = Date.now();
  let startTime = Date.now();
  let compilationCount = 0;

  const PERCENT_INTERVAL = 10;
  const TIME_INTERVAL_MS = 10000;

  const logInfo = (message: string) => {
    if (isShuttingDown) return;
    if (log) {
      log.info(message);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[@kbn/rspack-optimizer] ${message}`);
    }
  };

  const logDebug = (message: string) => {
    if (isShuttingDown) return;
    if (log) {
      log.debug(message);
    }
  };

  const logError = (message: string) => {
    if (isShuttingDown) return;
    if (log) {
      log.error(message);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[@kbn/rspack-optimizer] ${message}`);
    }
  };

  return {
    apply(compiler: Compiler) {
      compiler.hooks.compile.tap('LogProgressPlugin', () => {
        if (isShuttingDown) return;
        compilationCount++;
        startTime = Date.now();
        lastLogTime = Date.now();
        lastLoggedPercent = -PERCENT_INTERVAL;

        if (compilationCount === 1) {
          logInfo('Starting compilation...');
        }
      });

      new rspack.ProgressPlugin((percent: number, msg: string) => {
        if (isShuttingDown) return;
        // Only show progress details for the initial build
        if (compilationCount > 1) return;

        const percentInt = Math.floor(percent * 100);
        const now = Date.now();
        const timeSinceLastLog = now - lastLogTime;

        const nextMilestone =
          Math.ceil((lastLoggedPercent + 1) / PERCENT_INTERVAL) * PERCENT_INTERVAL;

        const hitPercentMilestone = percentInt >= nextMilestone;
        const hitTimeInterval =
          timeSinceLastLog >= TIME_INTERVAL_MS && percentInt > lastLoggedPercent;

        if (hitPercentMilestone || hitTimeInterval) {
          lastLoggedPercent = percentInt;
          lastLogTime = now;

          const stage = msg.split(' ')[0] || 'processing';
          const elapsed = ((now - startTime) / 1000).toFixed(1);

          logInfo(`${percentInt}% ${stage} [${elapsed}s]`);
        }
      }).apply(compiler);

      compiler.hooks.done.tap('LogProgressPlugin', (stats) => {
        if (isShuttingDown) return;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (stats.hasErrors()) {
          if (compilationCount === 1) {
            logError(`Compilation failed [${elapsed}s]`);
          } else {
            logDebug(`Compilation failed [${elapsed}s]`);
          }
        } else if (compilationCount === 1) {
          logInfo(`Compilation complete [${elapsed}s]`);
        } else {
          logDebug(`Compilation complete [${elapsed}s]`);
        }
      });
    },
  };
}
