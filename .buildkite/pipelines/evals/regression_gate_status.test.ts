/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';
import {
  getGateCompareArgs,
  getGateConnectorId,
  toConnectorId,
  toVerdictStatus,
} from './regression_gate_status.ts';

const GATED_SUITE: EvalsSuiteMetadataEntry = {
  id: 'gated',
  defaultModelGroups: ['eis/anthropic-claude-5.5-sonnet', 'eis/openai-gpt-5.4'],
  regressionGate: {
    dataset: 'golden',
    evaluator: 'goal_pass',
    minAbsoluteDrop: 0.1,
    alpha: 0.05,
    maxBaselineAgeDays: 3,
  },
};

describe('toConnectorId', () => {
  it('maps model groups to the fanout connector ids', () => {
    expect(toConnectorId('eis/anthropic-claude-5.5-sonnet')).toBe(
      'eis-anthropic-claude-5-5-sonnet'
    );
    expect(toConnectorId('openrouter/openai/gpt-5.4')).toBe('openrouter-openai-gpt-5-4');
    expect(toConnectorId('my-connector')).toBe('my-connector');
  });
});

describe('getGateCompareArgs', () => {
  it('gates only the first default model', () => {
    expect(getGateConnectorId(GATED_SUITE)).toBe('eis-anthropic-claude-5-5-sonnet');
    expect(getGateCompareArgs(GATED_SUITE, 'eis-anthropic-claude-5-5-sonnet')).toEqual([
      '--gate-dataset',
      'golden',
      '--gate-evaluator',
      'goal_pass',
      '--gate-min-drop',
      '0.1',
      '--gate-alpha',
      '0.05',
      '--gate-max-baseline-age-days',
      '3',
    ]);
    expect(getGateCompareArgs(GATED_SUITE, 'eis-openai-gpt-5-4')).toEqual([]);
  });

  it('passes no gate flags for an ungated suite', () => {
    expect(getGateCompareArgs({ id: 'plain', defaultModelGroups: ['eis/x'] }, 'eis-x')).toEqual([]);
  });
});

describe('toVerdictStatus', () => {
  it('maps verdicts to commit status states', () => {
    expect(toVerdictStatus('{"state":"regression","summary":"goal_pass 0.55 → 0.32"}')).toEqual({
      state: 'failure',
      description: 'goal_pass 0.55 → 0.32',
    });
    expect(toVerdictStatus('{"state":"pass","summary":"no regression"}').state).toBe('success');
    expect(toVerdictStatus('{"state":"inconclusive","summary":"no baseline"}').state).toBe('error');
  });

  it('treats a missing or malformed verdict as inconclusive', () => {
    expect(toVerdictStatus(undefined)).toEqual({
      state: 'error',
      description: 'the comparison produced no verdict',
    });
    expect(toVerdictStatus('{"state":"weird"}').state).toBe('error');
    expect(toVerdictStatus('not json').state).toBe('error');
  });
});
