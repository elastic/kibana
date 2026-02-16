/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CheckToRun, CheckResult, QuickChecksContext } from '../types';
import { MAX_PARALLELISM } from '../config';
import { humanizeTime, getScriptShortName } from '../utils';
import { getCommandForCheck } from '../checks/command';
import { runCheckAsync } from './runner';

/**
 * Execute checks in CI mode - simple parallel execution with plain logging
 * In fix mode, file-changing checks run sequentially first
 */
export async function executeChecksCI(
  checks: CheckToRun[],
  context: QuickChecksContext
): Promise<CheckResult[]> {
  const { log, fixMode } = context;
  const results: CheckResult[] = [];

  if (fixMode) {
    const fileChangingChecks = checks.filter((check) => check.mayChangeFiles);
    const regularChecks = checks.filter((check) => !check.mayChangeFiles);

    log.info(
      `Running ${checks.length} checks (${fileChangingChecks.length} sequential, ${regularChecks.length} parallel)...`
    );

    // Run file-changing checks sequentially first
    for (const check of fileChangingChecks) {
      const result = await runCheck(check, context, 'seq');
      results.push(result);
    }

    // Run regular checks in parallel batches
    const parallelResults = await runChecksInBatches(regularChecks, context);
    results.push(...parallelResults);
  } else {
    log.info(`Running ${checks.length} checks in parallel (max ${MAX_PARALLELISM} concurrent)...`);

    const parallelResults = await runChecksInBatches(checks, context);
    results.push(...parallelResults);
  }

  return results;
}

/**
 * Run a single check with logging
 */
async function runCheck(
  check: CheckToRun,
  context: QuickChecksContext,
  label?: string
): Promise<CheckResult> {
  const { log } = context;
  const scriptName = getScriptShortName(check.script);
  const command = getCommandForCheck(check, context);
  const prefix = label ? `(${label}) ` : '';

  log.info(`Starting ${prefix}${scriptName}`);

  const result = await runCheckAsync(check, command, context);
  const time = humanizeTime(result.durationMs);
  const status = result.success ? '✓' : '✗';

  log.info(`${status} ${scriptName} (${time})`);

  return result;
}

/**
 * Run checks in parallel batches, respecting MAX_PARALLELISM
 */
async function runChecksInBatches(
  checks: CheckToRun[],
  context: QuickChecksContext
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const pending = [...checks];

  while (pending.length > 0) {
    const batch = pending.splice(0, MAX_PARALLELISM);
    const batchResults = await Promise.all(batch.map((check) => runCheck(check, context)));
    results.push(...batchResults);
  }

  return results;
}
