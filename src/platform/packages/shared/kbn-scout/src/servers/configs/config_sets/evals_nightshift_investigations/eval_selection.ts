/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const NIGHTSHIFT_EVAL_SELECTIONS = ['all', 'synthetic-smoke', 'trace-only'] as const;

export type NightshiftEvalSelection = (typeof NIGHTSHIFT_EVAL_SELECTIONS)[number];

export interface ResolvedNightshiftEvalSelection {
  selection: NightshiftEvalSelection;
  /** True when the selection needs the investigation engine and sandbox-api. */
  needsSandbox: boolean;
  /** True when an unset selection fell back to smoke because no sandbox credentials were found. */
  fellBackToSmoke: boolean;
}

/**
 * Resolves `NIGHTSHIFT_DATASETS`. Unset runs every eval when sandbox credentials are present and
 * falls back to smoke otherwise; an explicit value is used as-is. Shared by the suite's Playwright
 * config and this Scout config set so the tests that run and the server they run on cannot drift.
 */
export const resolveNightshiftEvalSelection = (
  env: Record<string, string | undefined> = process.env
): ResolvedNightshiftEvalSelection => {
  const requested = env.NIGHTSHIFT_DATASETS;
  const hasSandbox = Boolean(env.SANDBOX_API_KEY);
  const selection = requested || (hasSandbox ? 'all' : 'synthetic-smoke');

  if (!(NIGHTSHIFT_EVAL_SELECTIONS as readonly string[]).includes(selection)) {
    throw new Error(
      `Unknown NIGHTSHIFT_DATASETS: ${selection}. Choose ${NIGHTSHIFT_EVAL_SELECTIONS.join(', ')}.`
    );
  }

  const resolved = selection as NightshiftEvalSelection;
  return {
    selection: resolved,
    needsSandbox: resolved !== 'synthetic-smoke',
    fellBackToSmoke: !requested && !hasSandbox,
  };
};
