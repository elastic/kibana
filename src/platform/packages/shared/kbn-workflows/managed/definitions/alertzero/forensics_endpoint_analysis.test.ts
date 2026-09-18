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
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW,
} from '.';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './forensics_endpoint_analysis.yaml';
import { renderCommonWorkerYaml } from './worker_template_values';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  if?: string;
}

const yaml = renderCommonWorkerYaml(FORENSICS_ENDPOINT_ANALYSIS_YAML, {
  settingsVersion: 1,
  autonomyLevel: 'manual',
});
const definition = parse(yaml) as {
  tags?: string[];
  settings?: { concurrency?: { key?: string; strategy?: string; max?: number } };
  triggers?: Array<{
    type: string;
    with?: { every?: string };
    inputs?: { required?: string[] };
  }>;
  steps: YamlStep[];
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? []), ...flatten(step.else ?? [])]);

const allSteps = flatten(definition.steps);
const stepByName = (name: string) => allSteps.find((step) => step.name === name);

describe('Endpoint analysis worker', () => {
  it('is the Watch-tagged dispatcher on a fixed one-minute sweep', () => {
    expect(ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW.id).toBe(
      'system-security-forensics-endpoint-analysis'
    );
    expect(definition.tags).toEqual(expect.arrayContaining(['watch', 'watch-forensics']));
    expect(definition.triggers?.map(({ type }) => type)).toEqual(['scheduled', 'manual']);
    expect(definition.triggers?.[0]?.with?.every).toBe('1m');
  });

  // The cadence is the poll rate of an indicator queue, not a Watch setting, so it
  // stays a literal. A `scheduleInterval` placeholder here would need a matching
  // settings declaration before the Worker could be saved.
  it('keeps the interval out of the settings contract', () => {
    expect(yaml).not.toContain('scheduleInterval');
    expect(yaml).not.toContain('__WORKER_SCHEDULE_INTERVAL__');
  });

  it('takes only sweep overrides on its manual trigger', () => {
    const manual = definition.triggers?.find(({ type }) => type === 'manual');
    expect(manual?.inputs?.required).toBeUndefined();
  });

  it('runs one sweep at a time per space', () => {
    expect(definition.settings?.concurrency).toEqual({
      key: 'endpoint-analysis-sweep',
      strategy: 'drop',
      max: 1,
    });
  });

  it('searches this space for pending analysis indicators', () => {
    const search = stepByName('search_pending_indicators');
    expect(search?.type).toBe('elasticsearch.search');
    expect(search?.with?.size).toBe('${{ steps.resolve_batch_size.output.size }}');

    const query = JSON.stringify(search?.with);
    expect(query).toContain('security.analyze_endpoint');
    expect(query).toContain('attributes.status');
    expect(query).toContain('{{ workflow.spaceId }}');
  });

  // The AI index only exists once something has written an indicator into it, so a
  // Worker switched on before the first handoff would otherwise fail a step every
  // minute against an index that is merely empty.
  it('treats a missing AI index as an empty one', () => {
    const search = stepByName('search_pending_indicators');
    expect(search?.with?.ignore_unavailable).toBe(true);
    expect(search?.with?.allow_no_indices).toBe(true);
  });

  it('dispatches the global analysis asynchronously and writes no indicators', () => {
    const start = stepByName('start_run');
    expect(start?.type).toBe('workflow.executeAsync');
    expect(start?.with?.['workflow-id']).toBe(
      ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID
    );
    expect(start?.with?.inputs).toEqual({
      ki_id: '{{ foreach.item._source.id | default: foreach.item._id }}',
      ai_index_id: '{{ inputs.ai_index_id | default: consts.ai_index_id }}',
    });

    expect(allSteps.some(({ type }) => type === 'context-engine.updateKi')).toBe(false);
    expect(allSteps.some(({ type }) => type === 'context-engine.createKi')).toBe(false);
    expect(allSteps.some(({ type }) => type === 'ai.agent')).toBe(false);
  });

  // `updateKi` resolves a write on the `id` field and only falls back to `_id` for
  // documents that have none, so the dispatch has to carry `id` for the child's
  // terminal write to land. The search is what has to fetch it.
  it('fetches the indicator id the child needs to retire it', () => {
    expect(stepByName('search_pending_indicators')?.with?._source).toEqual(['id']);
    expect(stepByName('start_run')?.with?.inputs).toMatchObject({
      ki_id: expect.stringContaining('_source.id'),
    });
  });

  it('starts up to two analyses per sweep', () => {
    expect(yaml).toContain('batch_size: 2');
  });
});
