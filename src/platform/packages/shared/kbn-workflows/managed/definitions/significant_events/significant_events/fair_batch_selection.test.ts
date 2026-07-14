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
  with?: {
    query?: string;
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

  it('selects and counts the complete detection queue with ES|QL', () => {
    const selection = getStep(DISCOVERY_YAML, 'get_detections');
    const count = getStep(DISCOVERY_YAML, 'count_detection_candidates');

    expect(selection.type).toBe('elasticsearch.esql.query');
    expect(selection.with?.query).toContain('INLINE STATS processed_count');
    expect(selection.with?.query).toContain('INLINE STATS latest_timestamp');
    expect(selection.with?.query).toContain('first_consideration_bonus');
    expect(selection.with?.query).toContain('LIMIT ?1');
    expect(count.with?.query).toContain('STATS candidate_count = COUNT(*)');
    expect(count.with?.query).not.toContain('LIMIT');
  });

  it('selects and counts the complete triage queue with the same fairness model', () => {
    const selection = getStep(TRIAGE_YAML, 'get_unassessed_discoveries');
    const count = getStep(TRIAGE_YAML, 'count_unassessed_discoveries');

    expect(selection.type).toBe('elasticsearch.esql.query');
    expect(selection.with?.query).toContain('INLINE STATS last_seen_timestamp');
    expect(selection.with?.query).toContain('INLINE STATS latest_timestamp');
    expect(selection.with?.query).toContain('BY event_id');
    expect(selection.with?.query).toContain('severity_score');
    expect(selection.with?.query).not.toContain('discovery_slug');
    expect(selection.with?.query).toContain('first_consideration_bonus');
    expect(selection.with?.query).toContain('LIMIT ?1');
    expect(count.with?.query).toContain('STATS candidate_count = COUNT(*)');
    expect(count.with?.query).not.toContain('LIMIT');
  });

  it('stamps every selected detection and discovery before agent execution', () => {
    const discovery = parse(DISCOVERY_YAML) as { steps: WorkflowStep[] };
    const triage = parse(TRIAGE_YAML) as { steps: WorkflowStep[] };

    expect(discovery.steps.findIndex(({ name }) => name === 'foreach_stamp_seen')).toBeLessThan(
      discovery.steps.findIndex(({ name }) => name === 'run_discovery_agent')
    );
    expect(triage.steps.findIndex(({ name }) => name === 'foreach_stamp_seen')).toBeLessThan(
      triage.steps.findIndex(({ name }) => name === 'run_judge_agent')
    );
  });
});
