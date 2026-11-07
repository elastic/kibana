/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS } from '.';
import FLOOR_ALERT_TRIAGE_REVOKE_DECISION_YAML from './floor_alert_triage_revoke_decision.yaml';

interface ParsedRevoke {
  triggers: Array<{
    type: string;
    inputs: { properties: { decision_id: { pattern: string } }; required: string[] };
  }>;
  steps: Array<{ name: string; type: string; with: Record<string, string> }>;
}

const parsed = parse(FLOOR_ALERT_TRIAGE_REVOKE_DECISION_YAML) as ParsedRevoke;

describe('floor_alert_triage_revoke_decision.yaml', () => {
  it('is installed with the other Alert Triage workflows', () => {
    expect(ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS).toContain(
      'system-security-floor-alert-triage-revoke-decision'
    );
  });

  it('is started by hand with a required decision id', () => {
    expect(parsed.triggers).toHaveLength(1);
    expect(parsed.triggers[0].type).toBe('manual');
    expect(parsed.triggers[0].inputs.required).toEqual(['decision_id']);
  });

  it('accepts the ids the store step writes, and nothing else', () => {
    const pattern = new RegExp(parsed.triggers[0].inputs.properties.decision_id.pattern);

    expect(pattern.test('fp-decision-0123456789abcdef')).toBe(true);
    expect(pattern.test('fp-dismissal-0123456789abcdef')).toBe(true);
    expect(pattern.test('fp-decision-0123456789abcdef-x')).toBe(false);
    expect(pattern.test('some-other-ki')).toBe(false);
  });

  it('hands the decision id to the revoke step and reports what it did', () => {
    const [revoke, result] = parsed.steps;

    expect(revoke.type).toBe('alertzero.triage.revokeFpDecision');
    expect(revoke.with.decision_id).toBe('{{ inputs.decision_id }}');
    expect(Object.keys(result.with)).toEqual([
      'status',
      'alerts_reopened',
      'alerts_released',
      'failures',
    ]);
  });
});
