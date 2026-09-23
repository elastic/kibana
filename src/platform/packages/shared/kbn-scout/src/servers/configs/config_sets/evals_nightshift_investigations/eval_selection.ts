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
  /** True when the selection runs investigation specs, which need the investigation engine and sandbox-api. */
  needsSandbox: boolean;
  /**
   * True when the Scout server should start with the investigation engine and sandbox. It depends
   * on credentials, not the selection: smoke runs on either server, and the CLI already restarts
   * Scout when `SANDBOX_*` changes but not when `NIGHTSHIFT_DATASETS` does.
   */
  startInvestigationServer: boolean;
  /** True when an unset selection fell back to smoke because no sandbox credentials were found. */
  fellBackToSmoke: boolean;
}

/** Resolves `NIGHTSHIFT_DATASETS` for both the suite's Playwright config and this Scout config set. */
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
  const needsSandbox = resolved !== 'synthetic-smoke';
  // Playwright resolves this on every run; a reused Scout server never reloads its config.
  if (needsSandbox && !hasSandbox) {
    throw new Error(
      `NIGHTSHIFT_DATASETS=${resolved} runs investigation evals, but SANDBOX_API_KEY is required; ` +
        'use --profile dev-vault, export SANDBOX_*, or select synthetic-smoke.'
    );
  }
  return {
    selection: resolved,
    needsSandbox,
    startInvestigationServer: hasSandbox,
    fellBackToSmoke: !requested && !hasSandbox,
  };
};
