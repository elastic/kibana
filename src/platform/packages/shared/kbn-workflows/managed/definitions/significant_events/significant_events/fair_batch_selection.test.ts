/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import DETECTION_YAML from './detection.yaml';
import DISCOVERY_YAML from './discovery.yaml';
import TRIAGE_YAML from './triage.yaml';

interface WorkflowStep {
  name: string;
  type: string;
  if?: string;
  condition?: string;
  steps?: WorkflowStep[];
  with?: {
    query?: string;
    filter?: unknown;
  };
}

const getStep = (yaml: string, name: string): WorkflowStep => {
  const workflow = parse(yaml) as { steps: WorkflowStep[] };
  const step = workflow.steps.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Step ${name} not found`);
  return step;
};

describe('significant events fair batch selection', () => {
  it('denormalizes the rule severity onto detection documents', () => {
    const writeDetection = getStep(DETECTION_YAML, 'foreach_rule') as WorkflowStep & {
      steps?: WorkflowStep[];
    };
    const serializedStep = JSON.stringify(writeDetection);

    expect(serializedStep).toContain('severity_score');
    expect(serializedStep).toContain('foreach.item.severity_score');
  });

  it('selects a bounded detection batch with ES|QL severity-plus-age scoring', () => {
    const selection = getStep(DISCOVERY_YAML, 'get_detections');
    const discovery = parse(DISCOVERY_YAML) as { steps: WorkflowStep[] };

    expect(selection.type).toBe('elasticsearch.esql.query');
    expect(selection.with?.query).toContain('INLINE STATS processed_count');
    expect(selection.with?.query).toContain('INLINE STATS latest_timestamp');
    expect(selection.with?.query).toContain('staleness_minutes');
    expect(selection.with?.query).toContain('LIMIT ?1');
    expect(selection.with?.query).not.toContain('seen_by');
    expect(discovery.steps.some(({ name }) => name === 'count_detection_candidates')).toBe(false);
  });

  it('selects a bounded triage batch with the same fairness model', () => {
    const selection = getStep(TRIAGE_YAML, 'get_unassessed_discoveries');
    const triage = parse(TRIAGE_YAML) as { steps: WorkflowStep[] };

    expect(selection.type).toBe('elasticsearch.esql.query');
    expect(selection.with?.query).toContain('INLINE STATS latest_timestamp');
    expect(selection.with?.query).toContain('BY event_id');
    expect(selection.with?.query).toContain('severity_score');
    expect(selection.with?.query).toContain('staleness_minutes');
    expect(selection.with?.query).not.toContain('discovery_slug');
    expect(selection.with?.query).not.toContain('seen_by');
    expect(selection.with?.query).toContain('LIMIT ?1');
    expect(triage.steps.some(({ name }) => name === 'count_unassessed_discoveries')).toBe(false);
  });

  it('stamps written-rule backlogs behind a type: if gate, not step-level if on ES|QL', () => {
    const discovery = parse(DISCOVERY_YAML) as { steps: WorkflowStep[] };

    const gate = discovery.steps.find(({ name }) => name === 'maybe_stamp_processed');
    expect(gate?.type).toBe('if');
    expect(gate?.condition).toContain('writtenCount > 0');

    const backlog = gate?.steps?.find(({ name }) => name === 'get_written_rules_backlog');
    expect(backlog?.type).toBe('elasticsearch.esql.query');
    expect(backlog?.if).toBeUndefined();
    expect(JSON.stringify(backlog?.with?.filter)).toContain('written_rule_uuids');
    expect(discovery.steps.some(({ name }) => name === 'get_rule_backlog')).toBe(false);
    expect(discovery.steps.some(({ if: stepIf }) => Boolean(stepIf))).toBe(false);
  });

  it('reports hasWork from the batch size so the drain loop can continue without a queue count', () => {
    const discovery = parse(DISCOVERY_YAML) as {
      outputs: Array<{ name: string }>;
      steps: Array<WorkflowStep & { with?: Record<string, unknown> }>;
    };
    const triage = parse(TRIAGE_YAML) as {
      outputs: Array<{ name: string }>;
      steps: Array<WorkflowStep & { with?: Record<string, unknown> }>;
    };

    expect(discovery.outputs.map(({ name }) => name)).toEqual(['processedCount', 'hasWork']);
    expect(triage.outputs.map(({ name }) => name)).toEqual(['processedCount', 'hasWork']);
    expect(discovery.steps.find(({ name }) => name === 'output_result')?.with).toMatchObject({
      hasWork: true,
    });
    expect(triage.steps.find(({ name }) => name === 'output_result')?.with).toMatchObject({
      hasWork: true,
    });
  });
});
