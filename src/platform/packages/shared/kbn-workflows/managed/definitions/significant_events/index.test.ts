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

interface WorkflowStep {
  name: string;
  type?: string;
  condition?: string;
  'on-failure'?: { continue?: boolean };
  steps?: WorkflowStep[];
  with?: {
    path?: string;
    body?: { trigger_feedback?: string };
    inputs?: { context?: { trigger_type?: string } };
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
const investigationCompleted = parse(SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW.yaml) as
  | ParsedWorkflow & {
      triggers: Array<{ type: string; on?: { condition?: string } }>;
    };

describe('significant events persistence workflow contracts', () => {
  it('bumps managed workflow versions for the bulk persistence contract', () => {
    expect(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.version).toBe(20);
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
    const triggerStep = requireStep(discovery, 'trigger_investigation') as {
      with?: { inputs?: { context?: { trigger_type?: string } } };
    };
    expect(triggerStep.with?.inputs?.context?.trigger_type).toBe('automatic');
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

  it('applies completed investigation feedback only to Significant Events', () => {
    expect(investigationCompleted.triggers).toEqual([
      {
        type: 'nightshift-investigations.completed',
        on: { condition: 'event.subject.type: "significant_event"' },
      },
    ]);
    const getInvestigation = requireStep(investigationCompleted, 'get_investigation');
    const attach = requireStep(investigationCompleted, 'attach_completed_investigation');
    expect(getInvestigation.with?.path).toContain('/internal/nightshift/investigations/');
    expect(attach.with?.path).toContain('/internal/significant_events/events/');
    expect(attach.with?.body?.trigger_feedback).toContain('output.trigger_feedback');
  });
});
