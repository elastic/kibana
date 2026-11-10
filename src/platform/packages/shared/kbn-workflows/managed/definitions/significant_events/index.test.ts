/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW, SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW } from '.';
import { SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW } from './knowledge_indicators';

interface WorkflowJsonSchema {
  type?: string;
  enum?: string[];
  description?: string;
  properties?: Record<string, WorkflowJsonSchema>;
  items?: WorkflowJsonSchema;
  required?: string[];
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

describe('significant events persistence workflow contracts', () => {
  it('bumps managed workflow versions for the bulk persistence contract', () => {
    expect(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.version).toBe(29);
    expect(SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW.version).toBe(4);
  });

  it('reports only the written rule uuids in the discovery output schema', () => {
    const schema = requireStep(discovery, 'run_discovery_agent').with?.schema;
    const properties = schema?.properties;

    // Nothing reads per-event outcomes from the agent: discovery starts no investigation.
    expect(Object.keys(properties ?? {})).toEqual(['written_rule_uuids']);
    expect(schema?.required).toEqual(['written_rule_uuids']);
    expect(properties?.written_rule_uuids?.description).toContain('unknown_event_id');
    expect(properties?.written_rule_uuids?.description).toContain(
      'intentionally determined not event-eligible'
    );
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

  it('starts no investigation from discovery', () => {
    // Significant events are investigated like any other alert: by an automation or by the
    // `Investigate` action, never by discovery.
    expect(findStep(discovery.steps, 'trigger_investigation')).toBeUndefined();
    expect(findStep(discovery.steps, 'maybe_trigger_investigations')).toBeUndefined();
    expect(findStep(discovery.steps, 'guard_missing_investigation')).toBeUndefined();
    expect(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.yaml).not.toContain('INVESTIGATABLE_SEVERITIES');
    expect(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.yaml).not.toContain(
      'nightshift.triggerInvestigation'
    );
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

  it('stamps discovery detections only from reported completed outcomes', () => {
    expect(requireStep(discovery, 'compute_written_rule_uuids').with?.written_rule_uuids).toContain(
      '| default: [] | uniq'
    );
    expect(requireStep(discovery, 'maybe_stamp_processed').condition).toContain(
      'steps.count_written_rules.output.writtenCount > 0'
    );
  });
});
