/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import ACTION_CLOSE_ALERTS_FALSE_POSITIVE_YAML from './action_close_alerts_false_positive.yaml';
import { createWorkflowLiquidEngine } from '../../../../common/utils';

interface ParsedStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
}

interface AlertsSearchQuery {
  bool: { filter: Array<Record<string, unknown>> };
}

describe('Close alerts as false positive action', () => {
  const workflow = parse(ACTION_CLOSE_ALERTS_FALSE_POSITIVE_YAML) as {
    consts?: { actionMetadata?: { category?: string } };
    steps: ParsedStep[];
  };
  const getStep = (name: string): ParsedStep => workflow.steps.find((step) => step.name === name)!;
  const failStep = getStep('fail_incomplete_close');
  const engine = createWorkflowLiquidEngine();

  // Mirrors WorkflowTemplatingEngine.evaluateExpression: strip the leading `$` and the
  // surrounding `{{ }}`, then evalValueSync the raw expression against a context — the
  // same call the execution engine makes for a step's `if` condition or `with` value.
  const evaluateExpression = (template: string, context: Record<string, unknown>): unknown =>
    engine.evalValueSync(
      template
        .replace(/^\$\{\{/, '')
        .replace(/\}\}$/, '')
        .trim(),
      context
    );

  // The completeness guard reads the end state back: how many of the requested ids are closed.
  const evaluateIfCondition = (closedAfter: number, alertIds: string[]): unknown =>
    evaluateExpression(failStep.if as string, {
      steps: { verify_close: { output: { hits: { total: { value: closedAfter } } } } },
      inputs: { actionInput: { alertIds } },
    });

  it('queues under Investigate so Respond stays reserved for containment actions', () => {
    expect(workflow.consts?.actionMetadata?.category).toBe('investigate');
  });

  it('places the read-back and the completeness guard between close_alerts and emit_result', () => {
    expect(workflow.steps.map((step) => step.name)).toEqual([
      'count_already_closed',
      'close_alerts',
      'verify_close',
      'fail_incomplete_close',
      'emit_result',
    ]);
  });

  it('is a workflow.fail step gated by an if condition', () => {
    expect(failStep.type).toBe('workflow.fail');
    expect(typeof failStep.if).toBe('string');
  });

  // Approving a proposal runs this with the proposal's `alertIds`. The close is an update by
  // query, so any clause beyond the ids (a rule, a time range) would close alerts the analyst
  // was never shown.
  it('closes only the open alerts named in the approved input, with nothing else in the query', () => {
    expect(getStep('close_alerts').with).toEqual({
      status: 'closed',
      reason: 'false_positive',
      conflicts: 'proceed',
      query: {
        bool: {
          filter: { terms: { _id: '${{ inputs.actionInput.alertIds }}' } },
          // Skips alerts that are already closed: no needless write, fewer version conflicts.
          must_not: { term: { 'kibana.alert.workflow_status': 'closed' } },
        },
      },
    });
  });

  it('resolves the close query to the approved ids', () => {
    const idsExpression = (
      getStep('close_alerts').with!.query as { bool: { filter: { terms: { _id: string } } } }
    ).bool.filter.terms._id.trim();

    expect(
      engine.evalValueSync(idsExpression.slice(3, -2).trim(), {
        inputs: { actionInput: { alertIds: ['alert-1', 'alert-2'] } },
      })
    ).toEqual(['alert-1', 'alert-2']);
  });

  // Both searches count closed alerts in the same way: count_already_closed for the close query's
  // skip, verify_close for the completeness guard.
  describe.each(['count_already_closed', 'verify_close'])('%s search', (stepName) => {
    const searchWith = getStep(stepName).with!;

    it('is a size 0 search on the space alerts index with an exact total', () => {
      expect(searchWith).toMatchObject({
        index: '.alerts-security.alerts-{{ workflow.spaceId }}',
        size: 0,
        track_total_hits: true,
      });
    });

    it('counts only the approved ids that are closed, with nothing else in the query', () => {
      expect((searchWith.query as AlertsSearchQuery).bool.filter).toEqual([
        { terms: { _id: '${{ inputs.actionInput.alertIds }}' } },
        { term: { 'kibana.alert.workflow_status': 'closed' } },
      ]);
    });
  });

  // The analyst closed some alerts before approving, or a retried close finished the rest.
  // Either way the end state is complete, so a lower `updated` is not a shortfall.
  it('does not fail when every requested alert is closed after the close', () => {
    expect(evaluateIfCondition(2, ['alert-1', 'alert-2'])).toBe(false);
  });

  // The same result covers an alert that no longer exists: a deleted alert never matches the
  // search, so counting closed ids against the requested ids keeps the guard failing loudly.
  it('fails when a requested alert is still open after the close', () => {
    expect(evaluateIfCondition(1, ['alert-1', 'alert-2'])).toBe(true);
  });

  it('fails when none of the requested alerts are closed after the close', () => {
    expect(evaluateIfCondition(0, ['alert-1', 'alert-2'])).toBe(true);
  });

  it('renders a message naming the shortfall', () => {
    const rendered = engine.parseAndRenderSync(failStep.with!.message as string, {
      steps: {
        verify_close: { output: { hits: { total: { value: 1 } } } },
        count_already_closed: { output: { hits: { total: { value: 0 } } } },
      },
      inputs: { actionInput: { alertIds: ['alert-1', 'alert-2'] } },
    });

    expect(rendered).toContain('Only 1 of 2 requested alert(s) are closed after the close');
    expect(rendered).toContain('0 were already closed before it');
  });

  // closed_count is an output for later callers (nothing in this repo reads it today). It is what
  // the close step updated, not requested minus the first count: an analyst can close an alert
  // between the count and the close, and the close skips it, so it must not be credited here.
  it('reports as closed only what the close step updated', () => {
    const closedCount = (
      (getStep('emit_result').with as Record<string, string>).closed_count as string
    ).trim();

    expect(
      evaluateExpression(closedCount, {
        // 4 requested, 1 already closed at the first count, and a second one closed by an analyst
        // before the close ran: the close updated the other 2.
        steps: {
          count_already_closed: { output: { hits: { total: { value: 1 } } } },
          close_alerts: { output: { updated: 2 } },
        },
        inputs: { actionInput: { alertIds: ['alert-1', 'alert-2', 'alert-3', 'alert-4'] } },
      })
    ).toBe(2);
  });
});
