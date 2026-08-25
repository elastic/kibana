/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW } from '.';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW } from '../nightshift_investigations/investigation';

interface WorkflowStep {
  name: string;
  type?: string;
  if?: string;
  condition?: string;
  steps?: WorkflowStep[];
  with?: {
    written_rule_uuids?: string;
    body?: { subject?: { id?: string } };
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
const investigation = parse(SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW.yaml) as ParsedWorkflow;

describe('significant events persistence workflow contracts', () => {
  it('bumps managed workflow versions for the bulk persistence contract', () => {
    expect(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.version).toBe(17);
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
});

describe('significant events investigation lifecycle contracts', () => {
  it('emits lifecycle events from the workflow and fails unsuccessful executions', () => {
    expect(SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW.version).toBe(7);
    expect(investigation.steps[0].name).toBe('emit_investigation_started');

    for (const stepName of [
      'emit_investigation_started',
      'emit_investigation_completed',
      'emit_investigation_failed',
    ]) {
      const step = requireStep(investigation, stepName);
      expect(step.type).toBe('kibana.request');
      expect(step.with?.body?.subject?.id).toContain('inputs.context.event_id');
    }

    expect(investigation.steps[investigation.steps.length - 1]).toMatchObject({
      name: 'fail_investigation',
      type: 'workflow.fail',
      if: '${{ steps.investigate.error != null }}',
    });
  });
});
