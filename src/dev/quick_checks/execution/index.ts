/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CheckToRun, CheckResult, QuickChecksContext } from '../types';
import { executeChecksCI } from './ci';
import { executeChecksLocally } from './local';

/**
 * Execute checks - dispatches to CI or local execution based on context
 */
export async function executeChecks(
  checks: CheckToRun[],
  context: QuickChecksContext
): Promise<CheckResult[]> {
  if (context.isCI) {
    context.log.write(`--- Running ${checks.length} checks in CI mode...`);
    context.log.write('');

    return executeChecksCI(checks, context);
  }

  return executeChecksLocally(checks, context);
}
