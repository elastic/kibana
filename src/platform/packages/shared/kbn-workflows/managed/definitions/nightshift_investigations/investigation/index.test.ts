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
  'connector-id'?: string;
  'connector-id-by-feature'?: string;
  with?: Record<string, unknown> & {
    method?: string;
    path?: string;
    message?: string;
    body?: Record<string, unknown>;
  };
  'on-failure'?: unknown;
  steps?: WorkflowStep[];
  else?: WorkflowStep[];
}

const investigation = parse(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml) as {
  name: string;
  triggers: Array<{
    inputs: { properties: Record<string, { type: string; maxLength?: number }> };
  }>;
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

const workflow = parse(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml) as {
  settings: { concurrency: { key: string; strategy: string; max: number } };
  triggers: Array<{ inputs: { properties: Record<string, unknown>; required: string[] } }>;
};

describe('Nightshift investigation workflow', () => {
  it('records the investigation through the agent tools rather than persist steps', () => {
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.id).toBe('system-nightshift-investigation');
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.version).toBe(2);
    expect(investigation.name).toBe('Nightshift Investigation');
    expect(investigation.steps.map((step) => step.name)).toEqual([
      'resolve_model',
      'ensure_investigation_agent',
      'persist_investigation_started',
      'emit_investigation_started',
      'investigate',
      'emit_investigation_completed',
      'emit_investigation_failed',
      'fail_investigation',
    ]);
    expect(requireStep('investigate').with?.message).toContain('{{ inputs.context | json }}');
  });

  it('resolves the requested model before persistence and passes it to the agent', () => {
    expect(investigation.triggers[0].inputs.properties.connector_id).toEqual(
      expect.objectContaining({ type: 'string', maxLength: 500 })
    );
    expect(investigation.steps[0]).toMatchObject({
      name: 'resolve_model',
      type: 'nightshift.resolveModel',
      with: {
        step: 'investigation',
        connector_id: '{{ inputs.connector_id }}',
      },
    });
    expect(requireStep('resolve_model')).toBe(investigation.steps[0]);
    expect(requireStep('investigate')['connector-id']).toBe(
      '{{ steps.resolve_model.output.connector_id }}'
    );
    expect(requireStep('investigate')['connector-id-by-feature']).toBeUndefined();
  });

  it('runs one execution per investigation at a time, in arrival order', () => {
    expect(workflow.settings.concurrency).toEqual({
      key: 'investigation:{{ inputs.investigation_id | default: execution.id }}',
      strategy: 'queue',
      max: 1,
    });
  });

  it('takes the investigation and its subjects as inputs, and no concurrency key', () => {
    const [{ inputs }] = workflow.triggers;
    expect(Object.keys(inputs.properties)).toEqual(
      expect.arrayContaining(['investigation_id', 'subjects', 'context'])
    );
    expect(inputs.properties).not.toHaveProperty('concurrency_key');
    // Agent Builder titles the investigation from its first round; `title` is still accepted.
    expect(inputs.required).toEqual(['message']);
    expect(inputs.properties).toHaveProperty('title');
  });

  it('lets the agent record its findings: no output schema, no conversation of its own', () => {
    const investigate = requireStep('investigate') as WorkflowStep & Record<string, unknown>;
    expect(investigate).not.toHaveProperty('create-conversation');
    expect(investigate).not.toHaveProperty('public-conversation');
    expect(investigate.with).not.toHaveProperty('schema');
    expect(investigate.with).not.toHaveProperty('metadata');
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml).not.toMatch(/ai\.attachment\./);
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml).not.toContain('method: PATCH');
  });

  it('attributes agent calls to Nightshift under the shared investigation id', () => {
    expect(requireStep('investigate')).toMatchObject({
      'plugin-id': 'nightshift_investigation',
      'aggregate-by': 'nightshift',
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

  it('addresses the investigation by its id rather than the run', () => {
    const requestSteps = collectStepsByType(investigation.steps, 'kibana.request');

    for (const { with: params } of requestSteps) {
      expect(params?.path).toContain('{{ inputs.investigation_id | default: execution.id }}');
    }
    expect(requireStep('persist_investigation_started').with?.body).toEqual({
      execution_id: '{{ execution.id }}',
    });
  });

  it('continues the conversation _ensure resolves', () => {
    expect(requireStep('investigate').with).toMatchObject({
      conversation_id: '${{ steps.persist_investigation_started.output.conversation_id }}',
    });
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml).not.toContain('inputs.conversation_id');
  });

  it('keeps the lifecycle emits and fails a run whose agent step failed', () => {
    expect(requireStep('emit_investigation_completed').if).toBe(
      '${{ steps.investigate.error == null }}'
    );
    expect(requireStep('emit_investigation_failed').if).toBe(
      '${{ steps.investigate.error != null }}'
    );
    expect(requireStep('fail_investigation')).toMatchObject({
      type: 'workflow.fail',
      if: '${{ steps.investigate.error != null }}',
    });
  });

  it('knows nothing about Slack', () => {
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml).not.toMatch(/slack/i);
  });
});
