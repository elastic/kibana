/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW, NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW_ID } from '.';

interface WorkflowTrigger {
  type: string;
  on?: { condition?: string };
}

interface WorkflowStep {
  name: string;
  type?: string;
  with?: Record<string, unknown>;
  'on-failure'?: unknown;
}

const workflow = parse(NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW.yaml) as {
  enabled: boolean;
  tags: string[];
  triggers: WorkflowTrigger[];
  settings: { concurrency: { key: string; strategy: string; max: number } };
  steps: WorkflowStep[];
};

describe('Watch Floor managed workflow', () => {
  it('has the expected id and management settings', () => {
    expect(NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW_ID).toBe('system-nightshift-automation-floor');
    expect(NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW.management.lifecycle).toBe('static');
    expect(NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW.management.enablement).toBe('restorable');
  });

  it('subscribes to significant-events.eventCreated', () => {
    expect(workflow.triggers).toHaveLength(1);
    expect(workflow.triggers[0].type).toBe('significant-events.eventCreated');
  });

  it('drops duplicate executions on the same event_id', () => {
    expect(workflow.settings.concurrency.strategy).toBe('drop');
    expect(workflow.settings.concurrency.key).toContain('event.event_id');
  });

  it('triggers an investigation as its only step', () => {
    expect(workflow.steps).toHaveLength(1);
    const step = workflow.steps[0];
    expect(step.type).toBe('nightshift.triggerInvestigation');
    expect(step.with?.subject_type).toBe('significant_event');
    expect(step.with?.trigger_type).toBe('automatic');
  });
});
