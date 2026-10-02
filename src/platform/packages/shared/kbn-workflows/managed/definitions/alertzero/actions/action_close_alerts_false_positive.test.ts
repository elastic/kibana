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
  // same call the execution engine makes for a step's `if` condition.
  const evaluateIfCondition = (output: { updated: number; total: number }): unknown => {
    const expression = (failStep.if as string)
      .replace(/^\$\{\{/, '')
      .replace(/\}\}$/, '')
      .trim();
    return engine.evalValueSync(expression, {
      steps: { close_alerts: { output } },
      inputs: { actionInput: { alertIds: ['alert-1', 'alert-2'] } },
    });
  };

  it('places the completeness guard between close_alerts and emit_result', () => {
    expect(workflow.steps.map((step) => step.name)).toEqual([
      'close_alerts',
      'fail_incomplete_close',
      'emit_result',
    ]);
  });

  it('is a workflow.fail step gated by an if condition', () => {
    expect(failStep.type).toBe('workflow.fail');
    expect(typeof failStep.if).toBe('string');
  });

  it('does not fail when every matched alert was updated', () => {
    expect(evaluateIfCondition({ updated: 2, total: 2 })).toBe(false);
  });

  it('does not fail when a requested alert no longer exists', () => {
    expect(evaluateIfCondition({ updated: 1, total: 1 })).toBe(false);
  });

  it('fails when a matched alert was skipped by a version conflict', () => {
    expect(evaluateIfCondition({ updated: 1, total: 2 })).toBe(true);
  });

  it('fails when none of the requested alerts exist', () => {
    expect(evaluateIfCondition({ updated: 0, total: 0 })).toBe(true);
  });

  it('fails when every matched alert hit a version conflict', () => {
    expect(evaluateIfCondition({ updated: 0, total: 2 })).toBe(true);
  });

  it('renders a message naming the shortfall', () => {
    const rendered = engine.parseAndRenderSync(failStep.with!.message as string, {
      steps: { close_alerts: { output: { updated: 1, total: 2 } } },
      inputs: { actionInput: { alertIds: ['alert-1', 'alert-2'] } },
    });

    expect(rendered).toContain('Closed 1 of 2 matched alert(s) as false positive');
  });
});
