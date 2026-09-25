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
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  if?: string;
  mode?: string;
  concurrency?: { max?: number };
  'on-failure'?: { continue?: boolean };
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
    inputs?: {
      required?: string[];
      properties?: Record<string, { pattern?: string; maxLength?: number }>;
    };
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

  // A concurrency group is (key, spaceId), so the constant key is already one sweep
  // per space. Adding `workflow.spaceId` to it would be redundant, and the literal
  // is what makes that reliance explicit.
  it('runs one sweep at a time per space', () => {
    expect(definition.settings?.concurrency).toEqual({
      key: 'endpoint-analysis-sweep',
      strategy: 'drop',
      max: 1,
    });
  });

  // `ai_index_id` is interpolated into the search target, where a comma or `*` is
  // valid multi-target syntax. A length bound alone would let a manual run read
  // outside the AI index, so the charset is what actually closes that off.
  it('rejects an ai_index_id that could widen the search target', () => {
    const manual = definition.triggers?.find(({ type }) => type === 'manual');
    const { pattern } = manual?.inputs?.properties?.ai_index_id ?? {};
    expect(pattern).toBeDefined();

    const accepts = (value: string) => new RegExp(pattern as string).test(value);
    expect(accepts('security-investigations')).toBe(true);
    expect(accepts('security-investigations,.alerts-security.alerts-default')).toBe(false);
    expect(accepts('*')).toBe(false);
    expect(accepts('security-*')).toBe(false);
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

  it('dispatches the global analysis asynchronously', () => {
    const start = stepByName('start_run');
    expect(start?.type).toBe('workflow.executeAsync');
    expect(start?.with?.['workflow-id']).toBe(
      ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID
    );
    expect(start?.with?.inputs).toEqual({
      ki_id: '{{ foreach.item._source.id | default: foreach.item._id }}',
      ai_index_id: '{{ inputs.ai_index_id | default: consts.ai_index_id }}',
    });
    expect(start?.if).toContain('steps.set_ki_autonomy.error == null');

    expect(allSteps.filter(({ type }) => type === 'context-engine.updateKi')).toEqual([
      expect.objectContaining({ name: 'set_ki_autonomy' }),
    ]);
    expect(allSteps.some(({ type }) => type === 'context-engine.createKi')).toBe(false);
    expect(allSteps.some(({ type }) => type === 'ai.agent')).toBe(false);
  });

  // The saved watch setting applies to the schedule. A manual run of this worker
  // must not carry `supervised` into the analysis, or containment runs on its own.
  describe('the autonomy it records before dispatch', () => {
    const liquid = createWorkflowLiquidEngine();
    const autonomyTemplate = String(
      (
        (stepByName('set_ki_autonomy')?.with?.ki as { attributes?: { autonomy?: string } })
          ?.attributes ?? {}
      ).autonomy
    );
    const renderAutonomy = (triggeredBy: string): Promise<string> =>
      liquid.parseAndRender(autonomyTemplate, {
        execution: { triggeredBy },
        consts: { worker_settings: { autonomy: 'supervised' } },
      });

    it('keeps the watch setting when the sweep is scheduled', async () => {
      await expect(renderAutonomy('scheduled')).resolves.toBe('supervised');
    });

    it('forces manual when the worker is run by hand', async () => {
      await expect(renderAutonomy('manual')).resolves.toBe('manual');
    });

    it('forces manual when some other workflow starts the worker', async () => {
      await expect(renderAutonomy('workflow-step')).resolves.toBe('manual');
    });
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

  // Rendered rather than asserted as a string, because the string cannot distinguish
  // the two cases it exists for. On an index-backed AI index `_source.id` and `_id` are
  // the same value, so a dispatch that silently used the wrong one would look correct
  // everywhere it is currently exercised; on a data-stream-backed one `_id` is a
  // revision, and handing that to the child leaves `updateKi` unresolved and the
  // indicator pending forever. Only evaluating the expression separates them.
  describe('the indicator id it hands the child', () => {
    const liquid = createWorkflowLiquidEngine();
    const kiIdTemplate = String(
      ((stepByName('start_run')?.with?.inputs ?? {}) as Record<string, string>).ki_id
    );
    const renderKiId = (item: Record<string, unknown>): Promise<string> =>
      liquid.parseAndRender(kiIdTemplate, { foreach: { item } });

    it('dispatches the indicator own id, not the document revision', async () => {
      await expect(
        renderKiId({ _id: 'gPGBsZoB1c4aVtXlTm2j', _source: { id: 'ki-analyze-endpoint-1' } })
      ).resolves.toBe('ki-analyze-endpoint-1');
    });

    it('falls back to the document id for an indicator written before createKi stamped one', async () => {
      await expect(renderKiId({ _id: 'gPGBsZoB1c4aVtXlTm2j', _source: {} })).resolves.toBe(
        'gPGBsZoB1c4aVtXlTm2j'
      );
    });
  });

  it('starts up to two analyses per sweep', () => {
    expect(yaml).toContain('batch_size: 2');
    expect(stepByName('start_runs')?.concurrency?.max).toBe(2);
  });

  // Settled keeps the "one rejection must not cost the rest of the batch" property
  // while leaving each branch's outcome in the aggregate. `on-failure: continue`
  // would clear the branch error, which is what made the old count unable to tell a
  // rejected dispatch from an accepted one.
  it('fans out settled so a rejected dispatch is recorded rather than cleared', () => {
    const fanOut = stepByName('start_runs');
    expect(fanOut?.type).toBe('parallel');
    expect(fanOut?.mode).toBe('settled');
    expect(stepByName('start_run')?.['on-failure']).toBeUndefined();
  });

  // A `foreach` publishes no aggregate and keeps only its last iteration, so the
  // count had no way to distinguish dispatches that were accepted from ones merely
  // attempted, and every batch reported as fully started.
  it('counts the dispatches the child accepted, not the ones it attempted', () => {
    const result = stepByName('emit_result')?.with;
    expect(result?.started).toBe('${{ steps.start_runs.output.succeeded | default: 0 }}');
    expect(result?.dispatch_failed).toBe('${{ steps.start_runs.output.failed | default: 0 }}');
    expect(result?.started).not.toContain('resolve_dispatch_batch');
  });
});
