/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW,
  SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW,
} from '.';
import { SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW } from './knowledge_indicators';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface WorkflowJsonSchema {
  type?: string;
  enum?: string[];
  description?: string;
  properties?: Record<string, WorkflowJsonSchema>;
  items?: WorkflowJsonSchema;
}

interface WorkflowStep {
  name: string;
  type?: string;
  condition?: string;
  'product-solution'?: string;
  'product-feature'?: string;
  'connector-id'?: string;
  'connector-id-by-feature'?: string;
  'on-failure'?: { continue?: boolean };
  steps?: WorkflowStep[];
  with?: {
    path?: string;
    body?: Record<string, unknown> & { runId?: string };
    subject_type?: string;
    subject_id?: string;
    trigger_type?: string;
    message?: string;
    stream_names?: string;
    written_rule_uuids?: string;
    inputs?: Record<string, string>;
    schema?: WorkflowJsonSchema;
  };
  foreach?: string;
}

interface ParsedWorkflow {
  steps: WorkflowStep[];
  triggers?: Array<{
    inputs?: {
      properties?: Record<string, { type?: string; maxLength?: number }>;
    };
  }>;
}

const findStep = (steps: WorkflowStep[], name: string): WorkflowStep | undefined => {
  for (const step of steps) {
    if (step.name === name) return step;
    const nested = step.steps ? findStep(step.steps, name) : undefined;
    if (nested) return nested;
  }
};

const requireStep = (workflow: ParsedWorkflow, name: string): WorkflowStep => {
  const step = findStep(workflow.steps, name);
  if (!step) throw new Error(`Expected workflow step ${name}`);
  return step;
};

const discovery = parse(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.yaml) as ParsedWorkflow;
const orchestrator = parse(SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW.yaml) as ParsedWorkflow;
const queriesGeneration = parse(
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW.yaml
) as ParsedWorkflow;
const investigationCompleted = parse(SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW.yaml) as
  | ParsedWorkflow & {
      triggers: Array<{ type: string; on?: { condition?: string } }>;
    };

describe('significant events persistence workflow contracts', () => {
  it('bumps managed workflow versions for the bulk persistence contract', () => {
    expect(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.version).toBe(23);
    expect(SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW.version).toBe(4);
  });

  it('accepts every non-written events_write result reason in the discovery output schema', () => {
    const schema = requireStep(discovery, 'run_discovery_agent').with?.schema;
    const properties = schema?.properties;
    const eventProperties = properties?.significant_events?.items?.properties;
    const nonWrittenReasons = [
      'bulk_error',
      'duplicate_in_batch',
      'existing_active_event',
      'unchanged_outcome',
      'unknown_event_id',
    ];

    expect(eventProperties?.reason?.enum).toEqual(nonWrittenReasons);
    expect(properties?.written_rule_uuids?.description).toContain('unknown_event_id');
  });

  it('bounds and forwards discovery model overrides', () => {
    expect(discovery.triggers?.[0].inputs?.properties?.connector_id).toEqual(
      expect.objectContaining({ type: 'string', maxLength: 255 })
    );
    expect(orchestrator.triggers?.[0].inputs?.properties?.connector_id).toEqual(
      expect.objectContaining({ type: 'string', maxLength: 255 })
    );
    expect(requireStep(orchestrator, 'discover').with?.inputs).toEqual({
      connector_id: '{{ inputs.connector_id }}',
    });
  });

  it('resolves the discovery model without the inference feature registry', () => {
    expect(requireStep(discovery, 'resolve_model')).toMatchObject({
      type: 'significantEvents.resolveModel',
      with: {
        connector_id: '{{ inputs.connector_id }}',
      },
    });
    expect(requireStep(discovery, 'run_discovery_agent')).toMatchObject({
      'connector-id': '{{ steps.resolve_model.output.connector_id }}',
    });
    expect(
      requireStep(discovery, 'run_discovery_agent')['connector-id-by-feature']
    ).toBeUndefined();
  });

  it('bootstraps per-space cleanup before discovery work', () => {
    expect(discovery.steps[0]).toMatchObject({
      name: 'bootstrap_cleanup_workflow',
      type: 'kibana.request',
      with: {
        path: '/s/{{ workflow.spaceId }}/internal/significant_events/maintenance/cleanup/_bootstrap',
      },
      'on-failure': { continue: true },
    });
  });

  it('marks discovery-triggered investigations as automatic', () => {
    const triggerStep = requireStep(discovery, 'trigger_investigation');
    expect(triggerStep).toMatchObject({
      type: 'nightshift.triggerInvestigation',
      with: {
        subject_type: 'significant_event',
        subject_id: '{{ foreach.item.event_id }}',
        trigger_type: 'automatic',
      },
      'on-failure': { continue: true },
    });
    expect(triggerStep.with?.message).toContain('Probable cause:');
    expect(triggerStep.with?.stream_names).toContain('stream_names');
  });

  it('bounds the discovery investigation message below the trigger input limit', () => {
    const message = requireStep(discovery, 'trigger_investigation').with?.message;
    if (!message) throw new Error('Expected trigger_investigation message');

    const renderedMessage = createWorkflowLiquidEngine().parseAndRenderSync(message, {
      steps: {
        resolve_active_event: {
          output: {
            hits: [
              {
                title: 'T'.repeat(512),
                summary: 'S'.repeat(10_000),
                symptom_hypothesis: 'H'.repeat(10_000),
              },
            ],
          },
        },
      },
    });

    expect(renderedMessage.length).toBeLessThanOrEqual(10_000);
    expect(renderedMessage).toContain('T'.repeat(512));
    expect(renderedMessage).toContain('S'.repeat(7000));
    expect(renderedMessage).not.toContain('S'.repeat(7001));
    expect(renderedMessage).toContain(`Probable cause: ${'H'.repeat(2000)}`);
    expect(renderedMessage).not.toContain('...');
  });

  it('attributes discovery agent calls to Nightshift', () => {
    expect(requireStep(discovery, 'run_discovery_agent')).toMatchObject({
      'plugin-id': 'nightshift_discovery',
      'aggregate-by': 'nightshift',
      'product-solution': 'observability',
      'product-feature': 'nightshift',
    });
  });

  it('sends the workflow execution id when generating KI queries', () => {
    expect(requireStep(queriesGeneration, 'generate_queries').with?.body?.runId).toBe(
      '${{ execution.id }}'
    );
  });

  it('stamps discovery detections only from confirmed write outcomes', () => {
    expect(requireStep(discovery, 'compute_written_rule_uuids').with?.written_rule_uuids).toContain(
      '| default: [] | uniq'
    );
    expect(requireStep(discovery, 'maybe_stamp_processed').condition).toContain(
      'steps.count_written_rules.output.writtenCount > 0'
    );
  });

  it('does not launch investigations without resolved event details', () => {
    expect(requireStep(discovery, 'guard_resolved_event').condition).toContain(
      'steps.resolve_active_event.output.hits[0] != null'
    );
  });

  it('skips investigation when the event already has investigations', () => {
    const guard = requireStep(discovery, 'guard_missing_investigation');
    // Condition must gate on the absence of prior investigations.
    expect(guard.condition).toContain('investigations');
    expect(guard.condition).toContain('== 0');

    // Evaluate the Liquid expression for both shapes of the Kibana response.
    const engine = createWorkflowLiquidEngine();
    // Strip the ${{ }} wrapper so the expression can be used inside a Liquid {% if %} tag.
    const inner = (guard.condition as string).replace(/^\s*\$\{\{(.+)\}\}\s*$/, '$1').trim();
    const template = `{% if ${inner} %}true{% else %}false{% endif %}`;

    const makeContext = (investigations: unknown[]) => ({
      steps: { resolve_active_event: { output: { hits: [{ investigations }] } } },
    });

    // Empty investigations → condition is true → investigation should be triggered.
    expect(engine.parseAndRenderSync(template, makeContext([]))).toBe('true');
    // Populated investigations → condition is false → investigation should be skipped.
    expect(engine.parseAndRenderSync(template, makeContext([{ id: 'inv-1' }]))).toBe('false');
  });

  it('attaches completed investigations only to Significant Events', () => {
    expect(investigationCompleted.triggers).toEqual([
      {
        type: 'nightshift-investigations.completed',
        on: { condition: 'event.subject.type: "significant_event"' },
      },
    ]);
    const attach = requireStep(investigationCompleted, 'attach_completed_investigation');
    expect(attach.with?.path).toContain('/internal/significant_events/events/');
    expect(attach.with?.body).toEqual({
      workflow_execution_id: '{{ event.investigation_id }}',
      started_at: '{{ event.started_at }}',
      completed_at: '{{ event.completed_at }}',
    });
  });
});
