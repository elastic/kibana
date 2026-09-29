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

interface WorkflowStep {
  name: string;
  type: string;
  if?: string;
  condition?: string;
  steps?: WorkflowStep[];
  with?: {
    query?: string;
    filter?: unknown;
    params?: unknown;
  };
}

const getStep = (yaml: string, name: string): WorkflowStep => {
  const workflow = parse(yaml) as { steps: WorkflowStep[] };
  const step = workflow.steps.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Step ${name} not found`);
  return step;
};

const findStepRecursive = (steps: WorkflowStep[], name: string): WorkflowStep | undefined => {
  for (const step of steps) {
    if (step.name === name) return step;
    if (step.steps) {
      const found = findStepRecursive(step.steps, name);
      if (found) return found;
    }
  }
  return undefined;
};

const hasStepLevelIfOnEsql = (steps: WorkflowStep[]): boolean =>
  steps.some(
    (step) =>
      (step.type === 'elasticsearch.esql.query' && Boolean(step.if)) ||
      (step.steps ? hasStepLevelIfOnEsql(step.steps) : false)
  );

describe('significant events fair batch selection', () => {
  it('denormalizes the rule severity onto detection documents', () => {
    const writeDetection = getStep(DETECTION_YAML, 'foreach_rule') as WorkflowStep & {
      steps?: WorkflowStep[];
    };
    const serializedStep = JSON.stringify(writeDetection);

    expect(serializedStep).toContain('severity_score');
    expect(serializedStep).toContain('foreach.item.severity_score');
  });

  it('selects a bounded detection batch with ES|QL severity-plus-age scoring and suppresses flaky rules with an age-based probe', () => {
    const selection = getStep(DISCOVERY_YAML, 'get_detections');
    const query = selection.with?.query;
    const discovery = parse(DISCOVERY_YAML) as { steps: WorkflowStep[] };

    expect(selection.type).toBe('elasticsearch.esql.query');
    expect(query).toContain('INLINE STATS processed_count');
    expect(query).toContain('INLINE STATS recent_detection_count');
    expect(query).toContain('INLINE STATS oldest_unprocessed');
    expect(query).toContain('latest_timestamp = MAX(@timestamp)');
    expect(query).toContain('suppressed_age_minutes');
    expect(query).toContain('staleness_minutes');
    expect(query).toContain('recent_detection_count < ?2');
    expect(query).toContain('suppressed_age_minutes >= ?3');
    expect(query).toContain('severity_score >= ?4');
    expect(query).toContain(
      'EVAL flaky_probe = recent_detection_count >= ?2 AND suppressed_age_minutes >= ?3'
    );
    expect(query).toContain('KEEP rule_uuid, _source, score, recent_detection_count, flaky_probe');

    const queryLines = query?.split('\n') ?? [];
    const suppressionLineIdx = queryLines.findIndex((l: string) =>
      l.includes('recent_detection_count < ?2')
    );
    const limitLineIdx = queryLines.findIndex((l: string) => l.includes('LIMIT ?1'));
    expect(suppressionLineIdx).toBeGreaterThan(-1);
    expect(limitLineIdx).toBeGreaterThan(-1);
    expect(suppressionLineIdx).toBeLessThan(limitLineIdx);

    const coalesceLineIdx = queryLines.findIndex((l: string) =>
      l.includes('COALESCE(severity_score')
    );
    expect(coalesceLineIdx).toBeGreaterThan(-1);
    expect(coalesceLineIdx).toBeLessThan(suppressionLineIdx);

    expect(query).not.toContain('seen_by');
    expect(discovery.steps.some(({ name }) => name === 'count_detection_candidates')).toBe(false);
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
    expect(hasStepLevelIfOnEsql(discovery.steps)).toBe(false);
  });

  it('keeps markers visible to the backlog dedup semijoin (rule filter is a should, not a bare terms)', () => {
    // Markers carry no rule_uuid; a bare terms filter drops them before the processed_count
    // join and every backlog detection gets re-stamped each cycle (nightshift-program#961).
    const gate = getStep(DISCOVERY_YAML, 'maybe_stamp_processed');
    const backlog = gate.steps?.find(({ name }) => name === 'get_written_rules_backlog');
    const filter = JSON.stringify(backlog?.with?.filter);

    expect(filter).toContain('"should"');
    expect(filter).toContain('"exists":{"field":"processed_by"}');
    expect(filter).toContain('"minimum_should_match":1');
    expect(backlog?.with?.query).toContain('INLINE STATS processed_count');
    expect(backlog?.with?.query).toContain('processed_count == 0');
  });

  it('reports hasWork from the batch size so the drain loop can continue without a queue count', () => {
    const discovery = parse(DISCOVERY_YAML) as {
      outputs: Array<{ name: string }>;
      steps: Array<WorkflowStep & { with?: Record<string, unknown> }>;
    };

    expect(discovery.outputs.map(({ name }) => name)).toEqual([
      'processedCount',
      'hasWork',
      'suppressedRuleCount',
    ]);
    expect(discovery.steps.find(({ name }) => name === 'output_result')?.with).toMatchObject({
      hasWork: true,
    });
    expect(discovery.steps.find(({ name }) => name === 'output_result')?.with).toHaveProperty(
      'suppressedRuleCount'
    );
    expect(findStepRecursive(discovery.steps, 'output_no_detections')?.with).toHaveProperty(
      'suppressedRuleCount'
    );
  });

  it('carries the three flaky-rule throttle inputs with documented defaults', () => {
    const discovery = parse(DISCOVERY_YAML) as {
      triggers: Array<{
        type: string;
        inputs?: Array<{ name: string; default: number; required: boolean }>;
      }>;
    };

    const manualTrigger = discovery.triggers.find((t) => t.type === 'manual');
    const inputs = manualTrigger?.inputs ?? [];

    const threshold = inputs.find((i) => i.name === 'flakyRuleDetectionThreshold');
    expect(threshold).toBeDefined();
    expect(threshold?.default).toBe(10);
    expect(threshold?.required).toBe(false);

    const probe = inputs.find((i) => i.name === 'flakyRuleProbeAfterMinutes');
    expect(probe).toBeDefined();
    expect(probe?.default).toBe(360);
    expect(probe?.required).toBe(false);

    const exempt = inputs.find((i) => i.name === 'flakyRuleExemptSeverityScore');
    expect(exempt).toBeDefined();
    expect(exempt?.default).toBe(80);
    expect(exempt?.required).toBe(false);
  });

  it('passes the four positional params in the expected order', () => {
    const selection = getStep(DISCOVERY_YAML, 'get_detections');
    // params is a YAML array of strings: detectionBatchMax, threshold, probe, exempt
    const params = selection.with?.params as string[] | undefined;
    expect(params).toHaveLength(4);
    expect(params?.[0]).toContain('detectionBatchMax');
    expect(params?.[1]).toContain('flakyRuleDetectionThreshold');
    expect(params?.[2]).toContain('flakyRuleProbeAfterMinutes');
    expect(params?.[3]).toContain('flakyRuleExemptSeverityScore');
  });
});
