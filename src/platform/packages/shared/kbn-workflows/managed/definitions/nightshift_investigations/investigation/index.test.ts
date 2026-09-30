/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW } from '.';

interface WorkflowStep {
  name: string;
  type?: string;
  if?: string;
  'plugin-id'?: string;
  'product-solution'?: string;
  'product-feature'?: string;
  with?: { method?: string; path?: string; message?: string; body?: Record<string, unknown> };
  'on-failure'?: unknown;
  steps?: WorkflowStep[];
  else?: WorkflowStep[];
}

const investigation = parse(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml) as {
  name: string;
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

describe('Nightshift investigation workflow', () => {
  it('persists the shared investigation output without sig-events write-back', () => {
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.id).toBe('system-nightshift-investigation');
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.version).toBe(1);
    expect(investigation.name).toBe('Nightshift Investigation');
    expect(investigation.steps.map((step) => step.name)).toEqual([
      'ensure_investigation_agent',
      'persist_investigation_started',
      'emit_investigation_started',
      'investigate',
      'persist_investigation_completed',
      'render_investigation_canvas',
      'update_investigation_canvas',
      'add_investigation_canvas',
      'persist_investigation_failed',
      'emit_investigation_completed',
      'emit_investigation_failed',
      'fail_investigation',
    ]);
    expect(investigation.steps.some((step) => step.name === 'merge_investigation_gaps')).toBe(
      false
    );

    const persistCompleted = requireStep('persist_investigation_completed');
    expect(persistCompleted.with?.body).toEqual(
      expect.objectContaining({
        status: 'completed',
        conversation_id: '${{ steps.investigate.output.conversation_id }}',
      })
    );
    expect(persistCompleted.with?.body).not.toHaveProperty('trigger_feedback');
    expect(persistCompleted.with?.body).toEqual(
      expect.objectContaining({
        blind_spots: '${{ steps.investigate.output.structured_output.blind_spots }}',
        impact: '${{ steps.investigate.output.structured_output.impact }}',
      })
    );
    expect(requireStep('investigate').with?.message).toContain('{{ inputs.context | json }}');
  });

  it('attributes agent calls to Nightshift under the shared investigation id', () => {
    expect(requireStep('investigate')).toMatchObject({
      'plugin-id': 'significant_events_investigation',
      'product-solution': 'observability',
      'product-feature': 'nightshift',
    });
  });

  it('space-scopes the path of every kibana.request step', () => {
    const requestSteps = collectStepsByType(investigation.steps, 'kibana.request');
    const unscoped = requestSteps.filter(
      ({ with: params }) => !params?.path?.startsWith('/s/{{ workflow.spaceId }}/')
    );

    expect(requestSteps.length).toBeGreaterThan(0);
    expect(unscoped.map(({ name, with: params }) => `${name}: ${params?.path}`)).toEqual([]);
  });

  it('addresses a continued investigation by its id rather than the run', () => {
    const requestSteps = collectStepsByType(investigation.steps, 'kibana.request');

    for (const { with: params } of requestSteps) {
      expect(params?.path).toContain('{{ inputs.investigation_id | default: execution.id }}');
    }
    expect(requireStep('persist_investigation_started').with?.body).toEqual({
      continue: '${{ inputs.investigation_id != null }}',
    });
  });

  it('continues the conversation the investigation record names', () => {
    expect(requireStep('investigate').with).toMatchObject({
      conversation_id: '${{ steps.persist_investigation_started.output.conversation_id }}',
    });
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml).not.toContain('inputs.conversation_id');
  });

  it('knows nothing about Slack', () => {
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml).not.toMatch(/slack/i);
  });

  it('adds the canvas only when no earlier run created it', () => {
    expect(requireStep('update_investigation_canvas').if).toBe(
      '${{ steps.investigate.error == null }}'
    );
    expect(requireStep('add_investigation_canvas')).toMatchObject({
      if: '${{ steps.investigate.error == null and steps.update_investigation_canvas.error != null }}',
      with: { id: '{{ inputs.investigation_id | default: execution.id }}', type: 'text' },
    });
  });
});
