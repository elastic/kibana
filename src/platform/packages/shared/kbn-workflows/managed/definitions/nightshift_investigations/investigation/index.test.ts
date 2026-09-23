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
  with?: { method?: string; path?: string; body?: { status?: string } };
  'on-failure'?: unknown;
  steps?: WorkflowStep[];
  else?: WorkflowStep[];
}

const investigation = parse(SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW.yaml) as {
  steps: WorkflowStep[];
};

const requireStep = (name: string): WorkflowStep => {
  const step = investigation.steps.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Expected workflow step ${name}`);
  return step;
};

const collectStepsByType = (steps: WorkflowStep[], type: string): WorkflowStep[] => {
  const matches: WorkflowStep[] = [];
  for (const step of steps) {
    if (step.type === type) matches.push(step);
    for (const nested of [step.steps, step.else]) {
      if (Array.isArray(nested)) {
        matches.push(...collectStepsByType(nested, type));
      }
    }
  }
  return matches;
};

describe('investigation lifecycle contracts', () => {
  it('emits lifecycle events and fails unsuccessful executions', () => {
    expect(SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW.version).toBe(10);
    expect(investigation.steps[0].name).toBe('ensure_investigation_agent');

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

  it('persists the investigation record before emit, retrying then failing the run', () => {
    expect(investigation.steps[1].name).toBe('persist_investigation_started');
    const persistStarted = requireStep('persist_investigation_started');

    expect(persistStarted.type).toBe('kibana.request');
    expect(persistStarted.with?.method).toBe('POST');
    expect(persistStarted.with?.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/nightshift/investigations/{{ execution.id }}/_ensure'
    );
    expect(persistStarted['on-failure']).toEqual({
      retry: { 'max-attempts': 3, delay: '5s', strategy: 'exponential' },
    });
  });

  it('persists completed structured output including severity and trigger_feedback', () => {
    const persistCompleted = requireStep('persist_investigation_completed');
    expect(persistCompleted.with?.body).toEqual(
      expect.objectContaining({
        status: 'completed',
        severity: '${{ steps.investigate.output.structured_output.severity }}',
        trigger_feedback: '${{ steps.investigate.output.structured_output.trigger_feedback }}',
      })
    );
    expect(investigation.steps.some((step) => step.name === 'attach_to_significant_event')).toBe(
      false
    );
  });

  it('space-scopes the path of every kibana.request step', () => {
    // Only generated `kibana.*` connector steps get a space prefix from the engine; a raw
    // `kibana.request` is sent verbatim, so an unprefixed path writes to the default space and
    // still returns 200. Asserting over every request step, rather than the ones that exist
    // today, keeps steps added later covered too.
    const requestSteps = collectStepsByType(investigation.steps, 'kibana.request');
    const unscoped = requestSteps.filter(
      ({ with: params }) => !params?.path?.startsWith('/s/{{ workflow.spaceId }}/')
    );

    expect(requestSteps.length).toBeGreaterThan(0);
    expect(unscoped.map(({ name, with: params }) => `${name}: ${params?.path}`)).toEqual([]);
  });
});
