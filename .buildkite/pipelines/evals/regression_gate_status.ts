/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';
import type { EvalsVerdictState } from './evals_gate_rules.ts';
import { truncateDescription } from './evals_gate_rules.ts';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * The connector id the fanout gives a model group, matching `generate_eis_connectors.js` (EIS) and
 * `connector_matching.js` (OpenRouter).
 */
export const toConnectorId = (modelGroup: string): string => {
  if (modelGroup.startsWith('eis/')) {
    return `eis-${slugify(modelGroup.slice('eis/'.length))}`;
  }
  if (modelGroup.startsWith('openrouter/')) {
    return slugify(modelGroup);
  }
  return modelGroup;
};

/** The connector whose run the suite's regression verdict is computed from: its first default model. */
export const getGateConnectorId = ({
  regressionGate,
  defaultModelGroups,
}: EvalsSuiteMetadataEntry): string | undefined =>
  regressionGate && defaultModelGroups?.[0] ? toConnectorId(defaultModelGroups[0]) : undefined;

/** `node scripts/evals compare` flags for the suite's gate, or none for any other connector. */
export const getGateCompareArgs = (
  suite: EvalsSuiteMetadataEntry,
  connectorId: string
): string[] => {
  const { regressionGate } = suite;
  if (!regressionGate || getGateConnectorId(suite) !== connectorId) {
    return [];
  }
  return [
    '--gate-dataset',
    regressionGate.dataset,
    '--gate-evaluator',
    regressionGate.evaluator,
    '--gate-min-drop',
    String(regressionGate.minAbsoluteDrop),
    '--gate-alpha',
    String(regressionGate.alpha),
    '--gate-max-baseline-age-days',
    String(regressionGate.maxBaselineAgeDays),
  ];
};

const STATE_BY_VERDICT: Record<string, Exclude<EvalsVerdictState, 'pending'>> = {
  pass: 'success',
  regression: 'failure',
  inconclusive: 'error',
};

/**
 * The `kibana-evals/<suite>` status for the JSON `compare --verdict-output` wrote. A missing or
 * unreadable verdict is an `error` (inconclusive), which the `evals gate` never blocks on.
 */
export const toVerdictStatus = (
  rawVerdict: string | undefined
): { state: Exclude<EvalsVerdictState, 'pending'>; description: string } => {
  try {
    const { state, summary } = JSON.parse(rawVerdict ?? '') as { state?: string; summary?: string };
    const statusState = state ? STATE_BY_VERDICT[state] : undefined;
    if (statusState && summary) {
      return { state: statusState, description: truncateDescription(summary) };
    }
  } catch {
    // fall through
  }
  return { state: 'error', description: 'the comparison produced no verdict' };
};
