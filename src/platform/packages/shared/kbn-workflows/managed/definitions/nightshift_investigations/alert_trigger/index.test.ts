/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW } from '.';

interface WorkflowStep {
  name: string;
  type?: string;
  foreach?: string;
  'max-iterations'?: unknown;
  with?: Record<string, unknown>;
  'on-failure'?: unknown;
  steps?: WorkflowStep[];
}

const workflow = parse(NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW.yaml) as {
  name: string;
  enabled: boolean;
  triggers: Array<{ type: string }>;
  settings?: {
    timeout?: string;
    concurrency?: { key?: string; strategy?: string; max?: number };
  };
  consts?: { max_alerts_per_run?: number };
  steps: WorkflowStep[];
};

describe('nightshift investigation alert trigger workflow', () => {
  it('is an opt-in v1 rule action that rate-limits and starts investigations', () => {
    expect(NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW.id).toBe(
      'system-nightshift-investigation-alert-trigger'
    );
    expect(NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW.visibility).toEqual({
      selectors: ['rule_action'],
    });
    expect(NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW.management.enablement).toBe(
      'restorable'
    );
    expect(workflow.name).toBe('[Experimental] Nightshift Investigation from an Alert rule');
    expect(workflow.enabled).toBe(true);
    expect(workflow.triggers).toEqual([{ type: 'alert' }]);
    expect(workflow.settings?.concurrency).toEqual({
      key: 'nightshift-investigation-alert-trigger-{{ workflow.spaceId }}-{{ event.rule.id }}',
      strategy: 'drop',
      max: 1,
    });
    expect(workflow.consts?.max_alerts_per_run).toBe(5);

    expect(workflow.steps.map((step) => step.name)).toEqual(['trigger_investigations']);
    const foreachStep = workflow.steps[0];
    expect(foreachStep.type).toBe('foreach');
    expect(foreachStep.foreach).toContain('event.alerts');
    expect(foreachStep.foreach).toContain('consts.max_alerts_per_run');
    expect(foreachStep['max-iterations']).toBe(5);

    const start = foreachStep.steps?.[0];
    expect(start).toMatchObject({
      name: 'start_investigation',
      type: 'nightshift.triggerInvestigation',
      'on-failure': { continue: true },
    });
    expect(start?.with).toMatchObject({
      subject_type: 'alert',
      title: '{{ foreach.item.kibana.alert.rule.name | default: event.rule.name }}',
      trigger_type: 'automatic',
    });
  });
});
