/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW, SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW } from '.';

interface WorkflowStep {
  name: string;
  condition?: string;
  steps?: WorkflowStep[];
  with?: Record<string, string>;
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
const triage = parse(SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW.yaml) as ParsedWorkflow;

describe('significant events persistence workflow contracts', () => {
  it('bumps managed workflow versions for the bulk persistence contract', () => {
    expect(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.version).toBe(12);
    expect(SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW.version).toBe(13);
  });

  it('stamps discovery detections only from confirmed write outcomes', () => {
    expect(requireStep(discovery, 'compute_written_rule_uuids').with?.written_rule_uuids).toContain(
      '| default: [] | uniq'
    );
    expect(requireStep(discovery, 'maybe_stamp_processed').condition).toContain(
      'steps.count_written_rules.output.writtenCount > 0'
    );
  });

  it('gates triage stamping and investigations on confirmed event writes', () => {
    expect(requireStep(triage, 'compute_written_event_ids').with?.written_event_ids).toContain(
      "reject: 'written', false"
    );
    expect(requireStep(triage, 'check_event_written').condition).toContain(
      'variables.written_event_ids contains'
    );
    expect(requireStep(triage, 'gate_investigatable_severity').condition).toContain(
      'foreach.item.event_uuid != null'
    );
  });
});
