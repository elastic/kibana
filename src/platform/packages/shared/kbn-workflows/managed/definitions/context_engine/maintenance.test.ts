/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type {
  ContextEngineDreamingWorkflowTemplateValues,
  ContextEngineMaintenanceWorkflowTemplateValues,
} from '.';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW, CONTEXT_ENGINE_MAINTENANCE_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

interface Step {
  name: string;
  type: string;
  status?: string;
  condition?: string;
  'on-failure'?: { continue?: boolean; retry?: unknown };
  foreach?: string;
  steps?: Step[];
  with?: Record<string, unknown>;
}

const findStep = (steps: Step[], name: string): Step => {
  const step = steps.find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`No step named '${name}'`);
  }
  return step;
};

const values: ContextEngineDreamingWorkflowTemplateValues &
  ContextEngineMaintenanceWorkflowTemplateValues = {
  aiIndexId: 'support-cases',
  instanceKey: 'support-cases-0123456789abcdef',
  memoriesIndex: 'ai-index-idx-support-cases',
  intervalMinutes: 90,
  connectorId: 'my-connector',
  instructions: 'Remember what customers "prefer".\nSkip {{ small talk }}.',
  factTypes: [{ type: 'preference' }],
  entityTypes: [{ type: 'customer' }],
  relationshipTypes: [],
  maintenanceIntervalMinutes: 1440,
  maintenanceMode: 'report',
};

const render = (overrides: Partial<ContextEngineMaintenanceWorkflowTemplateValues> = {}) =>
  parse(CONTEXT_ENGINE_MAINTENANCE_WORKFLOW.yamlTemplate({ ...values, ...overrides }));
const steps = (): Step[] => render().steps;
const batchSteps = () =>
  findStep(findStep(steps(), 'review').steps ?? [], 'batches').steps ?? ([] as Step[]);
const engine = createWorkflowLiquidEngine();
const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
  engine.evalValueSync(String(expression).slice(3, -2).trim(), scope);
const renderWith = (
  template: Record<string, unknown> | undefined,
  scope: Record<string, unknown>
) =>
  Object.fromEntries(
    Object.entries(template ?? {}).map(([key, value]) => [
      key,
      typeof value === 'string' && value.startsWith('${{')
        ? evaluate(value, scope)
        : typeof value === 'string'
        ? engine.parseAndRenderSync(value, scope)
        : value,
    ])
  );

const item = {
  id: 'fact-1',
  kind: 'fact',
  type: 'fact.preference',
  title: 'Bob likes aisles',
  content: 'Bob prefers aisle seats.',
  occurrences: 2,
  reasons: ['changed'],
};
const neighbor = { ...item, id: 'fact-2', title: 'Bob wants aisle seats', occurrences: 1 };
const batch = {
  audience: 'open',
  items: [item],
  neighbors: [neighbor],
  about_facts: [],
  relationships: [{ id: 'rel-1', from: 'a', relation: 'knows', to: 'b' }],
};

describe('CONTEXT_ENGINE_MAINTENANCE_WORKFLOW', () => {
  it('is its own workflow on its own schedule, keyed with dreaming so they never overlap', () => {
    const workflow = render();
    const dreaming = parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values));

    expect(workflow.name).toBe('Memory maintenance: support-cases');
    expect(workflow.settings.concurrency).toEqual(dreaming.settings.concurrency);
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '1440m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('writes its settings and the instructions into the consts exactly as given', () => {
    expect(render({ maintenanceMode: 'apply' }).consts).toEqual({
      ai_index_id: 'support-cases',
      connector_id: 'my-connector',
      instructions: values.instructions,
      mode: 'apply',
    });
  });

  it('checks the AI index maintains its memory before reading anything or calling a model', () => {
    expect(steps().map(({ name }) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'resume',
      'cursor',
      'gather',
      'plan_fixes',
      'planned',
      'review',
      'brake',
      'dry_run_result',
      'report_result',
      'braked_result',
      'apply_fixes',
      'applied',
      'apply',
      'record',
      'output_result',
    ]);
    expect(findStep(steps(), 'status').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      source: 'maintenance',
    });
    expect(findStep(steps(), 'paused').steps).toEqual([
      expect.objectContaining({ type: 'workflow.output', status: 'cancelled' }),
    ]);
  });

  it('gathers from where the last successful run stopped, or from the given time', () => {
    const gather = findStep(steps(), 'gather').with;
    const lastOutput = (mode: string) => ({
      output: {
        context: {
          output: {
            mode,
            resume_from: '2026-11-03T00:00:00Z',
            resume_after_id: 'fact-9',
            sweep_after_id: 'entity-4',
          },
        },
      },
    });
    const consts = render().consts;
    const lastRun = { output: { since: '2026-11-01T00:00:00Z' } };
    const withCursor = (scope: Record<string, unknown>) => ({
      ...scope,
      variables: renderWith(findStep(steps(), 'cursor').with, scope),
    });
    const scope = withCursor({
      consts,
      inputs: {},
      steps: { last_run: lastRun, last_output: lastOutput('report') },
    });

    expect(renderWith(gather, scope)).toEqual({
      ai_index_id: 'support-cases',
      since: '2026-11-03T00:00:00Z',
      after_id: 'fact-9',
      sweep_after_id: 'entity-4',
    });
    expect(renderWith(gather, { ...scope, inputs: { since: '2026-10-01T00:00:00Z' } })).toEqual(
      expect.objectContaining({ since: '2026-10-01T00:00:00Z', after_id: '' })
    );
    expect(
      renderWith(gather, withCursor({ consts, inputs: {}, steps: { last_run: lastRun } }))
    ).toEqual(expect.objectContaining({ since: '2026-11-01T00:00:00Z', after_id: '' }));
  });

  it('starts over when the last successful run had another mode', () => {
    const gather = findStep(steps(), 'gather').with;
    const scope = {
      consts: render({ maintenanceMode: 'apply' }).consts,
      inputs: {},
      steps: {
        last_run: { output: { since: '2026-11-01T00:00:00Z' } },
        last_output: {
          output: {
            context: {
              output: {
                mode: 'report',
                resume_from: '2026-11-03T00:00:00Z',
                resume_after_id: 'fact-9',
                sweep_after_id: 'entity-4',
              },
            },
          },
        },
      },
    };
    const variables = renderWith(findStep(steps(), 'cursor').with, scope);

    expect(variables).toEqual({ restart: true });
    expect(renderWith(gather, { ...scope, variables })).toEqual({
      ai_index_id: 'support-cases',
      since: '1970-01-01T00:00:00.000Z',
      after_id: '',
      sweep_after_id: '',
    });
  });

  it('plans each batch from the model, retrying the model, and adds the plans up', () => {
    const batchStepList = batchSteps();

    expect(batchStepList.map(({ name }) => name)).toEqual(['maintain', 'plan_batch', 'tally']);
    expect(findStep(batchStepList, 'maintain')['on-failure']).toEqual({
      retry: { 'max-attempts': 2, delay: '30s' },
    });
    expect(findStep(batchStepList, 'plan_batch').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      batch: '${{ foreach.item }}',
      changes: '${{ steps.maintain.output.content }}',
      plan_only: true,
    });

    const change = { id: 'fact-2', change: 'superseded', reason: 'Same' };
    const plan = { batch, changes: { merges: [] } };
    expect(
      renderWith(findStep(batchStepList, 'tally').with, {
        variables: {
          plans: [],
          written: 1,
          tombstones: 1,
          changes: [],
          needs_review: [],
          rejected: [],
        },
        steps: {
          plan_batch: {
            output: {
              plans: [plan],
              written: 1,
              tombstones: 1,
              changes: [change],
              needs_review: [],
              rejected: [{ item: 'x', reason: 'y' }],
            },
          },
        },
      })
    ).toEqual({
      plans: [plan],
      written: 2,
      tombstones: 2,
      changes: [change],
      needs_review: [],
      rejected: [{ item: 'x', reason: 'y' }],
    });
  });

  it('shows the model the batch, the instructions and the rules', () => {
    const rendered = engine.parseAndRenderSync(
      String(findStep(batchSteps(), 'maintain').with?.prompt),
      { consts: render().consts, foreach: { item: batch } }
    );

    expect(rendered).toContain(`INSTRUCTIONS:\n\n${values.instructions}\n`);
    expect(rendered).toContain(`ITEMS (one per line):\n${JSON.stringify(item)}\n`);
    expect(rendered).toContain(
      `NEIGHBORS (one per line, none when empty):\n${JSON.stringify(neighbor)}\n`
    );
    expect(rendered).toContain('FACTS ABOUT (one per line, none when empty):\n\n');
    expect(rendered).toContain(
      `RELATIONSHIPS (one per line, none when empty):\n${JSON.stringify(batch.relationships[0])}`
    );
    expect(rendered).toContain('person_edited true was edited by a person: never absorb it');
  });

  it('asks the model for each kind of change', () => {
    const { schema } = findStep(batchSteps(), 'maintain').with as {
      schema: { properties: Record<string, unknown> };
    };

    expect(Object.keys(schema.properties)).toEqual([
      'merges',
      'contradictions',
      'rewrites',
      'summaries',
      'relationships',
    ]);
  });

  it('brakes when the run would tombstone more than the gather step allows', () => {
    const brake = (tombstones: number) =>
      renderWith(findStep(steps(), 'brake').with, {
        consts: render().consts,
        steps: { gather: { output: { max_tombstones: 3 } } },
        variables: { tombstones },
      });

    expect(brake(3)).toEqual({ braked: false, reason: '' });
    expect(brake(4)).toEqual({
      braked: true,
      reason: 'It would tombstone 4 facts and entities, more than the 3 one run may.',
    });
  });

  it('ends a dry run cancelled and a report successful with its cursors, writing nothing', () => {
    const dryRun = findStep(steps(), 'dry_run_result');
    const report = findStep(steps(), 'report_result');

    expect(dryRun.condition).toBe('${{ inputs.dry_run == true }}');
    expect(dryRun.steps?.map(({ type, status }) => [type, status])).toEqual([
      ['context-engine.recordMaintenanceRun', undefined],
      ['workflow.output', 'cancelled'],
    ]);
    expect(findStep(dryRun.steps ?? [], 'record_dry_run').with?.mode).toBe('dry_run');
    expect(findStep(dryRun.steps ?? [], 'dry_run_output').with).not.toHaveProperty('resume_from');

    expect(evaluate(report.condition, { consts: render().consts })).toBe(true);
    expect(
      evaluate(report.condition, { consts: render({ maintenanceMode: 'apply' }).consts })
    ).toBe(false);
    expect(report.steps?.map(({ type, status }) => [type, status])).toEqual([
      ['context-engine.recordMaintenanceRun', undefined],
      ['workflow.output', undefined],
    ]);
    expect(findStep(report.steps ?? [], 'report_output').with).toEqual(
      expect.objectContaining({
        resume_from: '{{ steps.gather.output.resume_from }}',
        resume_after_id: '{{ steps.gather.output.resume_after_id }}',
        sweep_after_id: '{{ steps.gather.output.sweep_after_id }}',
      })
    );
  });

  it('ends a braked run cancelled before writing, so the next run reviews the same items', () => {
    const braked = findStep(steps(), 'braked_result');
    const names = steps().map(({ name }) => name);

    expect(braked.condition).toBe('${{ variables.braked == true }}');
    expect(braked.steps?.map(({ type, status }) => [type, status])).toEqual([
      ['context-engine.recordMaintenanceRun', undefined],
      ['workflow.output', 'cancelled'],
    ]);
    expect(names.indexOf('braked_result')).toBeLessThan(names.indexOf('apply_fixes'));
    expect(findStep(braked.steps ?? [], 'braked_output').with).toEqual(
      expect.objectContaining({
        mode: 'apply',
        tombstoned: '${{ steps.record_braked.output.tombstoned }}',
      })
    );
  });

  it('outputs its mode at every end that can be a successful run', () => {
    const report = findStep(findStep(steps(), 'report_result').steps ?? [], 'report_output');

    expect(report.with?.mode).toBe('report');
    expect(findStep(steps(), 'output_result').with?.mode).toBe('apply');
  });

  it('applies the fixes and each plan, then records the run and outputs its cursors', () => {
    const apply = findStep(steps(), 'apply');
    const plans = findStep(apply.steps ?? [], 'plans');

    expect(findStep(steps(), 'apply_fixes').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      fixes: '${{ steps.gather.output.fixes }}',
    });
    expect(plans.foreach).toBe('${{ variables.plans }}');
    expect(findStep(plans.steps ?? [], 'apply_batch').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      batch: '${{ foreach.item.batch }}',
      changes: '${{ foreach.item.changes }}',
    });
    expect(findStep(steps(), 'record').with?.mode).toBe('apply');
    expect(findStep(steps(), 'output_result').with).toEqual(
      expect.objectContaining({
        braked: false,
        changes: '${{ variables.changes | concat: variables.needs_review }}',
        sweep_after_id: '{{ steps.gather.output.sweep_after_id }}',
      })
    );
  });
});
