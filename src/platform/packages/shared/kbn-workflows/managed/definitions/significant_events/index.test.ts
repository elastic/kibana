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
} from '.';
import { SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW } from './knowledge_indicators';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface WorkflowStep {
  name: string;
  type?: string;
  condition?: string;
  'product-solution'?: string;
  'product-feature'?: string;
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
  };
  foreach?: string;
}

interface ParsedWorkflow {
  steps: WorkflowStep[];
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
const queriesGeneration = parse(
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW.yaml
) as ParsedWorkflow;
const investigationCompleted = parse(SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW.yaml) as
  | ParsedWorkflow & {
      triggers: Array<{ type: string; on?: { condition?: string } }>;
    };

describe('significant events persistence workflow contracts', () => {
  it('bumps managed workflow versions for the bulk persistence contract', () => {
    expect(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.version).toBe(21);
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
        resolve_open_event: {
          output: {
            hits: {
              hits: [
                {
                  _source: {
                    title: 'T'.repeat(512),
                    summary: 'S'.repeat(10_000),
                    symptom_hypothesis: 'H'.repeat(10_000),
                  },
                },
              ],
            },
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
      'steps.resolve_open_event.output.hits.hits[0] != null'
    );
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
