/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineTraceDreamingWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW, CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

interface Step {
  name: string;
  type: string;
  condition?: string;
  foreach?: string;
  concurrency?: number;
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

const values: ContextEngineTraceDreamingWorkflowTemplateValues = {
  aiIndexId: 'support-cases',
  instanceKey: 'support-cases-0123456789abcdef',
  memoriesIndex: 'ai-index-idx-support-cases',
  intervalMinutes: 90,
  connectorId: 'my-connector',
  instructions: 'Remember what customers "prefer".\nSkip {{ small talk }}.',
  factTypes: [{ type: 'preference', description: 'Something a customer likes.' }],
  entityTypes: [{ type: 'customer', attributes: ['tier'] }, { type: 'city' }],
  relationshipTypes: [{ type: 'lives_in', description: 'A customer lives in a city.' }],
};

const render = () => parse(CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW.yamlTemplate(values));
const batches = () => findStep(findStep(render().steps, 'dream').steps ?? [], 'batches');

describe('CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW', () => {
  it('is its own workflow on the dreaming schedule, named and keyed apart from dreaming', () => {
    const workflow = render();
    const dreaming = parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values));

    expect(CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW.id).not.toBe(CONTEXT_ENGINE_DREAMING_WORKFLOW.id);
    expect(workflow.name).toBe('Trace dreaming: support-cases');
    expect(workflow.settings.concurrency.key).toBe(
      'context-engine-trace-dreaming-support-cases-0123456789abcdef'
    );
    expect(workflow.settings.concurrency.key).not.toBe(dreaming.settings.concurrency.key);
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '90m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
  });

  it('runs each batch with the batch workflow of the same AI index', () => {
    expect(render().consts).toEqual({
      ai_index_id: 'support-cases',
      batch_workflow_id:
        'system-context-engine-trace-dreaming-batch-support-cases-0123456789abcdef',
    });
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('checks the AI index dreams and has trace sources before reading traces or calling a model', () => {
    const { steps } = render();

    expect(steps.map(({ name }: Step) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'resume',
      'read_traces',
      'active',
      'dream',
      'dry_run_result',
      'output_result',
    ]);
    expect(steps[0]).toEqual(
      expect.objectContaining({
        type: 'context-engine.getDreamingStatus',
        with: { ai_index_id: '{{ consts.ai_index_id }}', source: 'traces' },
      })
    );
    expect(findStep(steps, 'paused').steps).toEqual([
      expect.objectContaining({ type: 'workflow.output', status: 'cancelled' }),
    ]);
  });

  it('reads rounds from where the last run stopped, else since the last run, unless given a time', () => {
    const read = findStep(render().steps, 'read_traces');
    const engine = createWorkflowLiquidEngine();
    const { since, after } = read.with as { since: string; after: string };
    const lastRun = { output: { since: '2026-11-01T00:00:00.000Z' } };
    const lastOutput = {
      output: {
        context: { output: { resume_from: '2026-11-03T00:00:00Z', resume_after: 'trace-9' } },
      },
    };

    expect(read.type).toBe('context-engine.readTraceTranscripts');
    expect(engine.parseAndRenderSync(since, { inputs: {}, steps: { last_run: lastRun } })).toBe(
      '2026-11-01T00:00:00.000Z'
    );
    expect(
      engine.parseAndRenderSync(since, {
        inputs: {},
        steps: { last_run: lastRun, last_output: lastOutput },
      })
    ).toBe('2026-11-03T00:00:00Z');
    expect(
      engine.parseAndRenderSync(after, {
        inputs: {},
        steps: { last_run: lastRun, last_output: lastOutput },
      })
    ).toBe('trace-9');
    expect(
      engine.parseAndRenderSync(since, {
        inputs: { since: '2026-10-01T00:00:00Z' },
        steps: { last_run: lastRun, last_output: lastOutput },
      })
    ).toBe('2026-10-01T00:00:00Z');
    expect(
      engine.parseAndRenderSync(after, {
        inputs: { since: '2026-10-01T00:00:00Z' },
        steps: { last_run: lastRun, last_output: lastOutput },
      })
    ).toBe('');
  });

  it('outputs where the read stopped, so the next run continues from there', () => {
    const { steps } = render();
    const active = findStep(steps, 'active').with;
    const engine = createWorkflowLiquidEngine();
    const scope = {
      steps: {
        read_traces: {
          output: { memories: [], resume_from: '2026-11-05T00:00:00Z', resume_after: 'trace-9' },
        },
      },
    };

    expect(engine.parseAndRenderSync(String(active?.resume_from), scope)).toBe(
      '2026-11-05T00:00:00Z'
    );
    expect(engine.parseAndRenderSync(String(active?.resume_after), scope)).toBe('trace-9');
    expect(findStep(steps, 'output_result').with).toEqual(
      expect.objectContaining({
        rounds: '${{ variables.memories | size | default: 0 }}',
        resume_from: '{{ variables.resume_from }}',
        resume_after: '{{ variables.resume_after }}',
      })
    );
  });

  it('reads up to a token budget, and runs the batches the read packed, 4 at a time', () => {
    const { steps } = render();

    expect(findStep(steps, 'read_traces').with).toEqual(
      expect.objectContaining({ size: 1000, max_tokens: 1000000, batch_tokens: 100000 })
    );
    expect(findStep(steps, 'active').with?.batches).toBe('${{ steps.read_traces.output.batches }}');
    expect(batches()).toEqual(
      expect.objectContaining({
        type: 'parallel',
        foreach: '{{ variables.batches | json }}',
        concurrency: 4,
      })
    );
    expect(batches().steps).toEqual([
      {
        name: 'dream_batch',
        type: 'workflow.execute',
        with: {
          'workflow-id': '{{ consts.batch_workflow_id }}',
          inputs: {
            memories: '${{ foreach.item }}',
            dry_run: '${{ inputs.dry_run == true }}',
          },
        },
      },
    ]);
  });

  it('adds up what the batches wrote once they are all done, as they run at once', () => {
    const engine = createWorkflowLiquidEngine();
    const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
      engine.evalValueSync(String(expression).slice(3, -2).trim(), scope);
    const batch = (created: number) => ({
      created,
      updated: 1,
      deleted: 0,
      rejected: 0,
      would_write: [{ id: `ki-${created}` }],
    });

    const dream = findStep(render().steps, 'dream').steps ?? [];
    const tally = findStep(dream, 'tally');
    const add = findStep(tally.steps ?? [], 'add_batch').with ?? {};
    let variables: Record<string, unknown> = {
      created: 0,
      updated: 0,
      deleted: 0,
      rejected: 0,
      would_write: [],
    };
    for (const output of [batch(3), batch(4)]) {
      variables = Object.fromEntries(
        Object.entries(add).map(([key, expression]) => [
          key,
          evaluate(expression, { variables, foreach: { item: { output } } }),
        ])
      );
    }

    expect(tally.foreach).toBe('{{ steps.batches.output.results | json }}');
    expect(variables).toEqual({
      created: 7,
      updated: 2,
      deleted: 0,
      rejected: 0,
      would_write: [{ id: 'ki-3' }, { id: 'ki-4' }],
    });
    expect(findStep(render().steps, 'output_result').with).toEqual(
      expect.objectContaining({
        created: '${{ variables.created | default: 0 }}',
        rejected: '${{ variables.rejected | default: 0 }}',
      })
    );
  });
});
