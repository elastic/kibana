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
import { createWorkflowLiquidEngine } from '../../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { buildFieldsZodValidator } from '../../../../spec/lib/build_fields_zod_validator';
import { getInputsFromDefinition } from '../../../../spec/lib/field_conversion';
import { WorkflowSchema } from '../../../../spec/schema';

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

describe('Nightshift investigation workflow', () => {
  it('persists the shared investigation output without sig-events write-back', () => {
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.id).toBe('system-nightshift-investigation');
    expect(NIGHTSHIFT_INVESTIGATION_WORKFLOW.version).toBe(3);
    expect(investigation.name).toBe('Nightshift Investigation');
    expect(investigation.steps.map((step) => step.name)).toEqual([
      'resolve_model',
      'ensure_investigation_agent',
      'persist_investigation_started',
      'emit_investigation_started',
      'notify_started',
      'list_investigation_sources',
      'resolve_investigation_sources',
      'investigate',
      'persist_investigation_completed',
      'render_investigation_canvas',
      'list_conversation_attachments',
      'find_investigation_canvas',
      'update_investigation_canvas',
      'add_investigation_canvas',
      'persist_investigation_failed',
      'emit_investigation_completed',
      'emit_investigation_failed',
      'notify_completed',
      'notify_failed',
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
    expect(persistCompleted.with?.body).not.toHaveProperty('blind_spots');
    expect(persistCompleted.with?.body).not.toHaveProperty('timeline');
    expect(persistCompleted.with?.body).toEqual(
      expect.objectContaining({
        impact: '${{ steps.investigate.output.structured_output.impact }}',
      })
    );
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

  it('keeps each notification failure nonfatal and selects the terminal phase from the agent result', () => {
    for (const phase of ['started', 'completed', 'failed']) {
      const notify = requireStep(`notify_${phase}`);
      expect(notify.type).toBe('nightshift.sendNotifications');
      expect(notify.with).toMatchObject({
        investigation_id: '{{ inputs.investigation_id | default: execution.id }}',
        phase,
      });
      expect(notify['on-failure']).toEqual({ continue: true });
    }
    expect(requireStep('notify_started').if).toBeUndefined();
    expect(requireStep('notify_completed').if).toBe('${{ steps.investigate.error == null }}');
    expect(requireStep('notify_failed').if).toBe('${{ steps.investigate.error != null }}');
    expect(requireStep('fail_investigation').if).toBe('${{ steps.investigate.error != null }}');
    expect(investigation.steps.indexOf(requireStep('notify_started'))).toBeLessThan(
      investigation.steps.indexOf(requireStep('investigate'))
    );
    expect(requireStep('investigate')).not.toHaveProperty('create-conversation');
    expect(requireStep('investigate').with?.conversation_id).toBe(
      '${{ steps.persist_investigation_started.output.conversation_id }}'
    );
  });

  it('bounds agent errors before passing them to the failed notification step', () => {
    const template = requireStep('notify_failed').with?.reason;
    if (typeof template !== 'string') {
      throw new Error('Expected a failed notification reason template');
    }
    const engine = createWorkflowLiquidEngine({ outputDelimiterLeft: '${{' });
    const reason = engine.parseAndRenderSync(template, {
      steps: { investigate: { error: { message: 'Failure detail '.repeat(2000) } } },
    });
    expect(reason).toHaveLength(10000);
    expect(reason).toMatch(/^Failure detail /);
  });

  it('attributes agent calls to Nightshift under the shared investigation id', () => {
    expect(requireStep('investigate')).toMatchObject({
      'plugin-id': 'nightshift_investigation',
      'aggregate-by': 'nightshift',
      'product-solution': 'observability',
      'product-feature': 'nightshift',
    });
  });

  it('loads every requested source on one page', () => {
    expect(requireStep('list_investigation_sources').with?.path).toContain('per_page=100&');
  });

  it('passes WorkflowSchema normalization', () => {
    const result = WorkflowSchema.safeParse(parse(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml));
    expect(result.success ? null : result.error.issues).toBeNull();
  });

  it('accepts generic destinations and leaves connector-specific validation to runtime', () => {
    const validator = buildFieldsZodValidator(
      getInputsFromDefinition(parse(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml))
    );
    const base = { message: 'Investigate', title: 'Test' };
    const destination = {
      type: 'slack',
      connector_id: 'slack',
      params: { channel: '#alerts', thread_ts: '1.2' },
    };
    expect(validator.safeParse({ ...base, notificationDestinations: [destination] }).success).toBe(
      true
    );
    expect(
      validator.safeParse({
        ...base,
        notificationDestinations: [
          { type: 'future-connector', connector_id: 'c', params: { recipient: 'user' } },
        ],
      }).success
    ).toBe(true);
    expect(
      validator.safeParse({ ...base, notificationDestinations: [{ ...destination, params: {} }] })
        .success
    ).toBe(true);
    expect(validator.safeParse(base).success).toBe(true);
  });

  it('enforces envelope bounds and rejects fields outside params', () => {
    const validator = buildFieldsZodValidator(
      getInputsFromDefinition(parse(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml))
    );
    const base = { message: 'Investigate', title: 'Test' };
    const destination = { type: 'slack', connector_id: 'slack', params: { channel: '#alerts' } };
    const valid = (notificationDestinations: object[]) =>
      validator.safeParse({ ...base, notificationDestinations }).success;
    for (const [field, limit] of [
      ['type', 100],
      ['connector_id', 500],
    ] as const) {
      for (const value of [undefined, '', 'x'.repeat(limit + 1)])
        expect(valid([{ ...destination, [field]: value }])).toBe(false);
      expect(valid([{ ...destination, [field]: 'x'.repeat(limit) }])).toBe(true);
    }
    for (const field of ['automation_id', 'automation_name']) {
      expect(valid([{ ...destination, [field]: '' }])).toBe(true);
      expect(valid([{ ...destination, [field]: 'x'.repeat(500) }])).toBe(true);
      expect(valid([{ ...destination, [field]: 'x'.repeat(501) }])).toBe(false);
    }
    for (const params of [undefined, null, [], 'channel'])
      expect(valid([{ ...destination, params }])).toBe(false);
    for (const field of [
      'destination_index',
      'status',
      'attempt_id',
      'attempted_at',
      'message_ts',
      'error',
      'sent_at',
      'channel',
      'thread_ts',
    ])
      expect(valid([{ ...destination, [field]: 'sent' }])).toBe(false);
    expect(valid(Array(5).fill(destination))).toBe(true);
    expect(valid(Array(6).fill(destination))).toBe(false);
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
    // The source lookup lists sources by id and never touches the investigation document.
    const requestSteps = collectStepsByType(investigation.steps, 'kibana.request').filter(
      ({ name }) => name !== 'list_investigation_sources'
    );

    for (const { with: params } of requestSteps) {
      expect(params?.path).toContain('{{ inputs.investigation_id | default: execution.id }}');
    }
    expect(requireStep('persist_investigation_started').with?.body).toEqual({
      execution_id: '{{ execution.id }}',
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

  it('looks the canvas up, updates it when it is active and adds it when it does not exist', () => {
    expect(requireStep('render_investigation_canvas').with).toMatchObject({
      investigation_canvas_id: '{{ inputs.investigation_id | default: execution.id }}',
    });
    expect(requireStep('list_conversation_attachments')).toMatchObject({
      type: 'ai.attachment.list',
      with: { include_deleted: true },
    });
    expect(requireStep('update_investigation_canvas')).toMatchObject({
      if: '${{ variables.investigation_canvas_matches.first.active == true }}',
      with: { attachment_id: '{{ variables.investigation_canvas_id }}' },
    });
    expect(requireStep('add_investigation_canvas')).toMatchObject({
      if: '${{ variables.investigation_canvas_matches.size == 0 }}',
      with: { id: '{{ variables.investigation_canvas_id }}', type: 'text' },
    });
  });
});
