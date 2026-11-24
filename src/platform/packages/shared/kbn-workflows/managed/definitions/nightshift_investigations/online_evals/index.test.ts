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
  it('is manually triggered and not billed', () => {
    expect(workflow.triggers).toEqual([expect.objectContaining({ type: 'manual' })]);
    expect(NIGHTSHIFT_ONLINE_EVALS_WORKFLOW.billable).toBe(false);
  });

  const [scoreReferenceFree, scoreWiki, scoreAlertOutcome] = workflow.steps;
  const runsFor = (step: (typeof workflow.steps)[number], roundKind: string) =>
    createWorkflowLiquidEngine().evalValueSync((step.if ?? '').slice(3, -2), {
      inputs: { round_kind: roundKind },
    });

  it.each([
    ['initial', ['score_reference_free', 'score_wiki']],
    ['follow_up', []],
    ['alert_recovery', ['score_alert_outcome']],
  ])('scores a %s round with only %s', (roundKind, expected) => {
    expect(
      workflow.steps.filter((step) => runsFor(step, roundKind)).map(({ name }) => name)
    ).toEqual(expected);
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
            { name: 'nightshift_missing_data' },
            { name: 'nightshift_tool_call_health' },
          ],
          entry_point: '${{ inputs.entry_point }}',
        }),
      })
    );
  });

  it('scores the first-round report with the Wiki page judges in a separate call', () => {
    expect(scoreWiki).toEqual(
      expect.objectContaining({
        type: 'nightshift.onlineEvals.score',
        with: expect.objectContaining({
          graded_report: 'first_round',
          evaluator_set: 'reference_free',
          evaluators: [
            { name: 'nightshift_wiki_pages_read' },
            { name: 'nightshift_wiki_page_influence' },
          ],
          entry_point: '${{ inputs.entry_point }}',
        }),
      })
    );
  });

  it('grades the first-round report against an alert recovery with the alert-outcome judges', () => {
    expect(scoreAlertOutcome).toEqual(
      expect.objectContaining({
        type: 'nightshift.onlineEvals.score',
        with: expect.objectContaining({
          round_kind: '{{ inputs.round_kind }}',
          graded_report: 'first_round',
          evaluator_set: 'reference_based',
          evaluators: [
            { name: 'nightshift_alert_outcome_rca_accuracy' },
            { name: 'nightshift_alert_outcome_benign_classification' },
            { name: 'nightshift_alert_outcome_rca_reporting_gap' },
          ],
          entry_point: '${{ inputs.entry_point }}',
        }),
      })
    );
  });
});
