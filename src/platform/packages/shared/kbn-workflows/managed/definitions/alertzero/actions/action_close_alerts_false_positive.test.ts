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

describe('Close alerts as false positive action', () => {
  const workflow = parse(ACTION_CLOSE_ALERTS_FALSE_POSITIVE_YAML) as {
    consts?: { actionMetadata?: { category?: string } };
    steps: ParsedStep[];
  };
  const failStep = workflow.steps.find((step) => step.name === 'fail_incomplete_close')!;
  const engine = createWorkflowLiquidEngine();

  it('queues under Investigate so Respond stays reserved for containment actions', () => {
    expect(workflow.consts?.actionMetadata?.category).toBe('investigate');
  });

  // Mirrors WorkflowTemplatingEngine.evaluateExpression: strip the leading `$` and the
  // surrounding `{{ }}`, then evalValueSync the raw expression against a context — the
  // same call the execution engine makes for a step's `if` condition or value.
  const evaluate = (template: string, context: Record<string, unknown>): unknown =>
    engine.evalValueSync(
      template
        .replace(/^\$\{\{/, '')
        .replace(/\}\}$/, '')
        .trim(),
      context
    );
  const step = (name: string) => workflow.steps.find((candidate) => candidate.name === name)!;

  it('finds the eligible alerts, resolves the skipped ones, closes, then guards the result', () => {
    expect(workflow.steps.map((candidate) => candidate.name)).toEqual([
      'find_eligible_alerts',
      'resolve_eligible_alerts',
      'resolve_skipped_alerts',
      'close_alerts',
      'count_closed_alerts',
      'fail_incomplete_close',
      'emit_result',
    ]);
  });

  it('is a workflow.fail step gated by an if condition', () => {
    expect(failStep.type).toBe('workflow.fail');
    expect(typeof failStep.if).toBe('string');
  });

  // An analyst excludes an alert by giving it another verdict tag, maybe leaving
  // `az:false_positive` on it. Approval can land before the proposal is revised, so the close
  // itself must not touch such an alert.
  it('is eligible only with az:false_positive and neither other verdict tag', () => {
    expect(step('find_eligible_alerts').with!.query).toEqual({
      bool: {
        filter: [
          { terms: { _id: '${{ inputs.actionInput.alertIds }}' } },
          { term: { 'kibana.alert.workflow_tags': 'az:false_positive' } },
        ],
        must_not: [
          {
            terms: {
              'kibana.alert.workflow_tags': ['az:true_positive', 'az:inconclusive'],
            },
          },
        ],
      },
    });
  });

  // The close is an update by query, so any clause beyond the ids (a rule, a time range) would
  // close alerts the analyst was never shown.
  it('closes only the eligible alerts, with nothing else in the query', () => {
    expect(step('close_alerts').with).toEqual({
      status: 'closed',
      reason: 'false_positive',
      conflicts: 'proceed',
      query: { bool: { filter: { terms: { _id: '${{ variables.eligible_alert_ids }}' } } } },
    });
  });

  it('skips the close when nothing is eligible', () => {
    expect(
      evaluate(step('close_alerts').if as string, { variables: { eligible_alert_ids: [] } })
    ).toBe(false);
  });

  it('reads the eligible ids from the search hits', () => {
    expect(
      evaluate(step('resolve_eligible_alerts').with!.eligible_alert_ids as string, {
        steps: {
          find_eligible_alerts: { output: { hits: { hits: [{ _id: 'a' }, { _id: 'c' }] } } },
        },
      })
    ).toEqual(['a', 'c']);
  });

  it('skips the requested alerts that are not eligible', () => {
    expect(
      evaluate(step('resolve_skipped_alerts').with!.skipped_alert_ids as string, {
        inputs: { actionInput: { alertIds: ['a', 'b', 'c'] } },
        variables: { eligible_alert_ids: ['a', 'c'] },
      })
    ).toEqual(['b']);
  });

  const failsFor = (closed: number, eligible: string[]) =>
    evaluate(failStep.if as string, {
      variables: { closed_count: closed, eligible_alert_ids: eligible },
    });

  it('does not fail when every eligible alert was closed, even if others were skipped', () => {
    expect(failsFor(2, ['alert-1', 'alert-2'])).toBe(false);
  });

  it('does not fail when nothing was eligible', () => {
    expect(failsFor(0, [])).toBe(false);
  });

  it('fails when fewer eligible alerts were closed than expected', () => {
    expect(failsFor(1, ['alert-1', 'alert-2'])).toBe(true);
  });

  it('fails when none of the eligible alerts were closed (conflicts: proceed no-op)', () => {
    expect(failsFor(0, ['alert-1', 'alert-2'])).toBe(true);
  });

  it('renders a message naming the shortfall', () => {
    const rendered = engine.parseAndRenderSync(failStep.with!.message as string, {
      variables: { closed_count: 1, eligible_alert_ids: ['alert-1', 'alert-2'] },
    });

    expect(rendered).toContain('Closed 1 of 2 eligible alert(s) as false positive');
  });

  it('emits the skipped alerts', () => {
    expect(step('emit_result').with).toEqual(
      expect.objectContaining({ skipped_alert_ids: '${{ variables.skipped_alert_ids }}' })
    );
  });
});
