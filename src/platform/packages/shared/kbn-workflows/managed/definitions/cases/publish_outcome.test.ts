/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { CASES_PUBLISH_OUTCOME_WORKFLOW } from '.';

describe('Cases publish outcome workflow', () => {
  const definition = parse(CASES_PUBLISH_OUTCOME_WORKFLOW.yaml) as {
    enabled: boolean;
    triggers: Array<{ type: string; on: { condition: string } }>;
    steps: Array<{
      name: string;
      type: string;
      if?: string;
      with?: Record<string, unknown>;
      'on-failure'?: { continue?: boolean };
    }>;
  };

  it('ships enabled, owned by cases, and runs on a close or a reopen', () => {
    expect(CASES_PUBLISH_OUTCOME_WORKFLOW.pluginId).toBe('cases');
    expect(CASES_PUBLISH_OUTCOME_WORKFLOW.billable).toBe(false);
    expect(definition.enabled).toBe(true);
    expect(definition.triggers).toEqual([
      {
        type: 'cases.caseStatusUpdated',
        on: { condition: 'event.status: "closed" or event.previousStatus: "closed"' },
      },
    ]);
  });

  it('publishes only what the outcome step allows, and retracts by the same id', () => {
    const [outcome, publish, retract] = definition.steps;
    expect(outcome.type).toBe('cases.getCaseOutcome');
    expect(publish).toMatchObject({
      type: 'context-engine.createKi',
      if: '${{ steps.outcome.output.publish == true }}',
      with: { ai_index_id: 'cases-outcomes', ki_id: '{{ steps.outcome.output.ki_id }}' },
    });
    expect(retract).toMatchObject({
      type: 'context-engine.deleteKi',
      if: '${{ steps.outcome.output.retract == true }}',
      'on-failure': { continue: true },
      with: { ai_index_id: 'cases-outcomes', ki_id: '{{ steps.outcome.output.ki_id }}' },
    });
  });
});
