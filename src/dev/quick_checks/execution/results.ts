/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { CheckResult } from '../types';
import { humanizeTime } from '../utils';

/**
 * Print the results of all checks
 */
export function printResults(
  startTimestamp: number,
  results: CheckResult[],
  log: ToolingLog
): void {
  const totalDuration = results.reduce((acc, result) => acc + result.durationMs, 0);
  const total = humanizeTime(totalDuration);
  const effective = humanizeTime(Date.now() - startTimestamp);

  log.info(`- Total time: ${total}, effective: ${effective}`);

  results.forEach((result) => {
    if (!result.success) {
      // Show node command if available, otherwise fall back to shell script
      const commandDisplay = result.nodeCommand || result.script;
      log.info(`- ${commandDisplay}: ${humanizeTime(result.durationMs)}`);
      log.error(result.output);
    }
  });
}

/**
 * Print the final summary of the check run
 */
export function printSummary(
  results: CheckResult[],
  commitsWereMade: boolean,
  scriptStartTime: number,
  log: ToolingLog
): number {
  const failedChecks = results.filter((check) => !check.success);

  if (failedChecks.length > 0) {
    log.write(`--- ${failedChecks.length} quick check(s) failed. ❌`);
    log.write(`See the script(s) marked with ❌ above for details.`);
  } else if (!commitsWereMade) {
    log.write('--- All checks passed. ✅');
  }

  // Display total elapsed time at the end
  const totalElapsedTime = humanizeTime(Date.now() - scriptStartTime);
  log.write(`\n--- Total elapsed time: ${totalElapsedTime}`);

  return failedChecks.length > 0 ? 1 : 0;
}
