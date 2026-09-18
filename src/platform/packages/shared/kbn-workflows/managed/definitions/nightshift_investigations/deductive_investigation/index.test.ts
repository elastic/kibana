/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { DEDUCTIVE_INVESTIGATION_WORKFLOW } from '.';

interface WorkflowStep {
  name: string;
  type?: string;
  if?: string;
  with?: { method?: string; path?: string; body?: Record<string, unknown> };
  'on-failure'?: unknown;
  steps?: WorkflowStep[];
  else?: WorkflowStep[];
}

const investigation = parse(DEDUCTIVE_INVESTIGATION_WORKFLOW.yaml) as {
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

describe('deductive investigation workflow', () => {
  it('is a lean persist-and-agent run without sig-events write-back', () => {
    expect(DEDUCTIVE_INVESTIGATION_WORKFLOW.id).toBe('system-deductive-investigation');
    expect(DEDUCTIVE_INVESTIGATION_WORKFLOW.version).toBe(1);
    expect(investigation.name).toBe('Deductive Investigation');
    expect(investigation.steps.map((step) => step.name)).toEqual([
      'ensure_investigation_agent',
      'persist_investigation_started',
      'emit_investigation_started',
      'investigate',
      'persist_investigation_completed',
      'persist_investigation_failed',
      'update_investigation_attachment',
      'create_investigation_attachment',
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
        execution_id: '{{ execution.id }}',
      })
    );
    expect(persistCompleted.with?.body).not.toHaveProperty('trigger_feedback');
    expect(persistCompleted.with?.body).not.toHaveProperty('impact');
    expect(persistCompleted.with?.body).not.toHaveProperty('blind_spots');
  });

  it('queues inputs by stable investigation and updates one attachment', () => {
    const parsed = parse(DEDUCTIVE_INVESTIGATION_WORKFLOW.yaml) as {
      settings: { concurrency: { strategy: string; key: string; max: number } };
    };
    expect(parsed.settings.concurrency).toEqual({
      strategy: 'queue',
      key: 'deductive-investigation-{{ inputs.investigation_id | default: inputs.concurrency_key | default: execution.id }}',
      max: 1,
    });
    // The findings are attached under the investigation's own type, which is the only attachment
    // type that renders them on a Canvas; `text` would only ever render as an inline code block.
    const attachmentData = {
      investigation_id: '{{ inputs.investigation_id | default: execution.id }}',
      state: '${{ steps.investigate.output.structured_output }}',
    };
    expect(requireStep('update_investigation_attachment').with).toEqual(
      expect.objectContaining({
        attachment_id: 'nightshift-investigation',
        data: attachmentData,
      })
    );
    expect(requireStep('update_investigation_attachment').if).toContain('acknowledged == true');
    expect(requireStep('create_investigation_attachment').with).toEqual(
      expect.objectContaining({
        id: 'nightshift-investigation',
        type: 'platform.nightshift_investigation',
        data: attachmentData,
      })
    );
  });

  it('space-scopes the path of every kibana.request step', () => {
    const requestSteps = collectStepsByType(investigation.steps, 'kibana.request');
    const unscoped = requestSteps.filter(
      ({ with: params }) => !params?.path?.startsWith('/s/{{ workflow.spaceId }}/')
    );

    expect(requestSteps.length).toBeGreaterThan(0);
    expect(unscoped.map(({ name, with: params }) => `${name}: ${params?.path}`)).toEqual([]);
  });
});
