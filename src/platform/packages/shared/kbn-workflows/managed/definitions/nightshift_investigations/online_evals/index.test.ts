/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_ONLINE_EVALS_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../../common/utils';

const workflow = parse(NIGHTSHIFT_ONLINE_EVALS_WORKFLOW.yaml) as {
  triggers: Array<{ type: string }>;
  steps: Array<{ name: string; type: string; if?: string; with: Record<string, unknown> }>;
};

describe('nightshift online evals workflow', () => {
  it('is started only by the investigation workflow and is not billed', () => {
    expect(workflow.triggers).toEqual([expect.objectContaining({ type: 'manual' })]);
    expect(NIGHTSHIFT_ONLINE_EVALS_WORKFLOW.billable).toBe(false);
  });

  const [scoreReferenceFree] = workflow.steps;

  it.each([
    ['initial', true],
    ['follow_up', false],
    ['alert_recovery', false],
  ])('scores a %s round with the reference-free judges: %s', (roundKind, expected) => {
    const condition = scoreReferenceFree.if ?? '';
    expect(
      createWorkflowLiquidEngine().evalValueSync(condition.slice(3, -2), {
        inputs: { round_kind: roundKind },
      })
    ).toBe(expected);
  });

  it('grades the first-round report with the reference-free judges', () => {
    expect(scoreReferenceFree).toEqual(
      expect.objectContaining({
        type: 'nightshift.onlineEvals.score',
        with: expect.objectContaining({
          graded_report: 'first_round',
          evaluator_set: 'reference_free',
          evaluators: [
            { name: 'nightshift_rca_reward' },
            { name: 'nightshift_investigation_process' },
            { name: 'nightshift_conclusion_quality' },
          ],
        }),
      })
    );
  });
});
