/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_WORKFLOW } from './floor_alert_triage_attach_new_rules';
import FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_YAML from './floor_alert_triage_attach_new_rules.yaml';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface Step {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean; retry?: { 'max-attempts'?: number } };
}

const parsed = parse(FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_YAML) as {
  triggers: Array<{ type: string; on?: unknown }>;
  steps: Step[];
};

const attach = parsed.steps.find(({ name }) => name === 'attach_rules');
const engine = createWorkflowLiquidEngine();

describe('Alert Triage attach new rules workflow', () => {
  it('is started by the rule created trigger and by nothing else', () => {
    expect(parsed.triggers).toEqual([{ type: 'security.detectionRulesCreated' }]);
  });

  it('is installed globally and managed by AlertZero, so it only exists while AlertZero does', () => {
    expect(ALERTZERO_FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_WORKFLOW).toMatchObject({
      id: 'system-security-floor-alert-triage-attach-new-rules',
      pluginId: expect.stringContaining('alertzero'),
    });
  });

  it('makes one POST to the AlertZero attach route in the space of the run', () => {
    expect(attach?.type).toBe('kibana.request');
    expect(attach?.with).toMatchObject({
      method: 'POST',
      path: '/s/{{ workflow.spaceId }}/internal/alertzero/workers/system-security-floor-alert-triage/rules/_attach',
      headers: { 'elastic-api-version': '1', 'Content-Type': 'application/json' },
    });
    expect(parsed.steps.filter(({ type }) => type === 'kibana.request')).toHaveLength(1);
  });

  it('sends the ids of the created rules as an array, not as text', () => {
    const body = (attach?.with as { body: Record<string, string> }).body;
    const expression = body.ruleIds;
    const sentIds = engine.evalValueSync(expression.trim().slice(3, -2).trim(), {
      event: { ids: ['so-1', 'so-2'], types: ['query'], tags: [], totalCount: 2 },
    });

    expect(sentIds).toEqual(['so-1', 'so-2']);
  });

  // The route answers 500 when the attach fails, so continuing past it would turn a missed attach
  // into a run that looks successful.
  it('retries a failed attach and then fails the run instead of continuing', () => {
    expect(attach?.['on-failure']?.retry?.['max-attempts']).toBeGreaterThan(1);
    expect(attach?.['on-failure']?.continue).not.toBe(true);
  });

  // A separate "is the Worker on" request before the attach reopens the window the route closes by
  // checking and attaching in one call.
  it('does not check the Worker in a separate request before attaching', () => {
    const requests = parsed.steps.filter(({ type }) => type === 'kibana.request');
    expect(requests.map(({ name }) => name)).toEqual(['attach_rules']);
    expect(FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_YAML).not.toContain('runtime_config');
  });

  it.each([
    { outcome: 'worker_disabled', expected: 'Alert Triage attach: worker_disabled' },
    { outcome: 'worker_unavailable', expected: 'Alert Triage attach: worker_unavailable' },
  ])('logs $outcome as a plain result and ends the run', ({ outcome, expected }) => {
    const log = parsed.steps.find(({ name }) => name === 'log_outcome');
    const rendered = engine.parseAndRenderSync((log?.with as { message: string }).message, {
      steps: { attach_rules: { output: { outcome } } },
      event: { totalCount: 3 },
    });

    expect(rendered.replace(/\s+/g, ' ').trim()).toBe(expected);
  });

  it('logs how many rules were attached out of how many were created', () => {
    const log = parsed.steps.find(({ name }) => name === 'log_outcome');
    const rendered = engine.parseAndRenderSync((log?.with as { message: string }).message, {
      steps: { attach_rules: { output: { outcome: 'attached', matched: 3, updated: 2 } } },
      event: { totalCount: 3 },
    });

    expect(rendered.replace(/\s+/g, ' ').trim()).toBe(
      'Alert Triage attach: attached (2 of 3 rules attached, 3 created)'
    );
  });
});
