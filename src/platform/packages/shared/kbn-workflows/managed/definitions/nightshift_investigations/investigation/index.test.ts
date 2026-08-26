/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW } from '.';

interface WorkflowStep {
  name: string;
  type?: string;
  if?: string;
  with?: { body?: { status?: string } };
}

const investigation = parse(SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW.yaml) as {
  steps: WorkflowStep[];
};

const requireStep = (name: string): WorkflowStep => {
  const step = investigation.steps.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Expected workflow step ${name}`);
  return step;
};

describe('investigation lifecycle contracts', () => {
  it('emits lifecycle events and fails unsuccessful executions', () => {
    expect(SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW.version).toBe(8);
    expect(investigation.steps[0].name).toBe('emit_investigation_started');

    const expectedStatuses: Record<string, string> = {
      emit_investigation_started: 'running',
      emit_investigation_completed: 'completed',
      emit_investigation_failed: 'failed',
    };
    for (const [stepName, status] of Object.entries(expectedStatuses)) {
      const step = requireStep(stepName);
      expect(step.type).toBe('kibana.request');
      expect(step.with?.body).toEqual({ status });
    }

    expect(investigation.steps[investigation.steps.length - 1]).toMatchObject({
      name: 'fail_investigation',
      type: 'workflow.fail',
      if: '${{ steps.investigate.error != null }}',
    });
  });
});
