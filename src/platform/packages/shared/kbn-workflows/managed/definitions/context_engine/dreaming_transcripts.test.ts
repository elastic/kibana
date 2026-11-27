/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineTranscriptDreamingWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW, CONTEXT_ENGINE_TRANSCRIPT_DREAMING_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

interface Step {
  name: string;
  type: string;
  condition?: string;
  foreach?: string;
  concurrency?: number;
  'max-iterations'?: number;
  'on-failure'?: { continue?: boolean };
  steps?: Step[];
  with?: Record<string, unknown>;
}

const pageSteps = (workflow: { steps: Step[] }): Step[] =>
  findStep(workflow.steps, 'drain').steps ?? [];

const findStep = (steps: Step[], name: string): Step => {
  const step = steps.find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`No step named '${name}'`);
  }
  return step;
};

const values: ContextEngineTranscriptDreamingWorkflowTemplateValues = {
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

const render = () => parse(CONTEXT_ENGINE_TRANSCRIPT_DREAMING_WORKFLOW.yamlTemplate(values));
const batches = () => findStep(findStep(pageSteps(render()), 'dream').steps ?? [], 'batches');

describe('CONTEXT_ENGINE_TRANSCRIPT_DREAMING_WORKFLOW', () => {
  it('is its own workflow on the dreaming schedule, named and keyed apart from dreaming', () => {
    const workflow = render();
    const dreaming = parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values));

    expect(CONTEXT_ENGINE_TRANSCRIPT_DREAMING_WORKFLOW.id).not.toBe(
      CONTEXT_ENGINE_DREAMING_WORKFLOW.id
    );
    expect(workflow.name).toBe('Transcript dreaming: support-cases');
    expect(workflow.settings.concurrency).toEqual(dreaming.settings.concurrency);
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
        'system-context-engine-transcript-dreaming-batch-support-cases-0123456789abcdef',
      workflow_id: 'system-context-engine-transcript-dreaming-support-cases-0123456789abcdef',
      drain_budget_seconds: 1440,
    });
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('checks the AI index dreams before reading session events or calling a model', () => {
    const { steps } = render();

    expect(steps.map(({ name }: Step) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'resume',
      'init',
      'drain',
      'more_rounds',
      'dry_run_result',
      'output_result',
    ]);
    expect(steps[0]).toEqual(
      expect.objectContaining({
        type: 'context-engine.getDreamingStatus',
        with: { ai_index_id: '{{ consts.ai_index_id }}', source: 'transcripts' },
      })
    );
    expect(findStep(steps, 'paused').steps).toEqual([
      expect.objectContaining({ type: 'workflow.output', status: 'cancelled' }),
    ]);
  });

  it('starts from where the last run stopped, else since the last run, unless given a time', () => {
    const init = findStep(render().steps, 'init').with as {
      resume_from: string;
      resume_after: string;
    };
    const engine = createWorkflowLiquidEngine();
    const lastRun = { output: { since: '2026-11-01T00:00:00.000Z' } };
    const lastOutput = {
      output: {
        context: { output: { resume_from: '2026-11-03T00:00:00Z', resume_after: 'trace-9' } },
      },
    };
    const cursor = (scope: Record<string, unknown>) => ({
      from: engine.parseAndRenderSync(init.resume_from, scope),
      after: engine.parseAndRenderSync(init.resume_after, scope),
    });

    expect(cursor({ inputs: {}, steps: { last_run: lastRun } })).toEqual({
      from: '2026-11-01T00:00:00.000Z',
      after: '',
    });
    expect(cursor({ inputs: {}, steps: { last_run: lastRun, last_output: lastOutput } })).toEqual({
      from: '2026-11-03T00:00:00Z',
      after: 'trace-9',
    });
    expect(
      cursor({
        inputs: { since: '2026-10-01T00:00:00Z' },
        steps: { last_run: lastRun, last_output: lastOutput },
      })
    ).toEqual({ from: '2026-10-01T00:00:00Z', after: '' });
  });

  it('reads each page from the cursor the previous page left', () => {
    const read = findStep(pageSteps(render()), 'read_transcripts');
    const { since, after } = read.with as { since: string; after: string };
    const scope = { variables: { resume_from: '2026-11-05T00:00:00Z', resume_after: 'trace-9' } };
    const engine = createWorkflowLiquidEngine();

    expect(read.type).toBe('context-engine.readSessionTranscripts');
    expect(engine.parseAndRenderSync(since, scope)).toBe('2026-11-05T00:00:00Z');
    expect(engine.parseAndRenderSync(after, scope)).toBe('trace-9');
  });

  it('outputs where the read stopped, so the next run continues from there', () => {
    const { steps } = render();
    const active = findStep(pageSteps(render()), 'page').with;
    const engine = createWorkflowLiquidEngine();
    const scope = {
      steps: {
        read_transcripts: {
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
        rounds: '${{ variables.rounds | default: 0 }}',
        resume_from: '{{ variables.resume_from }}',
        resume_after: '{{ variables.resume_after }}',
      })
    );
  });

  it('reads up to a token budget, and runs the batches the read packed, 4 at a time', () => {
    expect(findStep(pageSteps(render()), 'read_transcripts').with).toEqual(
      expect.objectContaining({ size: 1000, max_tokens: 600000, batch_tokens: 50000 })
    );
    expect(findStep(pageSteps(render()), 'page').with?.batches).toBe(
      '${{ steps.read_transcripts.output.batches }}'
    );
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

    const dream = findStep(pageSteps(render()), 'dream').steps ?? [];
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

  describe('draining a backlog', () => {
    const engine = createWorkflowLiquidEngine();
    const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
      engine.evalValueSync(String(expression).slice(3, -2).trim(), scope);
    const drain = () => findStep(render().steps, 'drain');
    const consts = { drain_budget_seconds: 1440 };

    it('loops pages in a while step, bounded by max-iterations and 80% of the run timeout', () => {
      const workflow = render();

      expect(drain().type).toBe('while');
      expect(drain()['max-iterations']).toBe(100);
      expect(workflow.consts.drain_budget_seconds).toBe(0.8 * 30 * 60);
      expect(workflow.settings.timeout).toBe('30m');
    });

    it('continues only while the last page was capped, a page fits the budget, and it is not a dry run', () => {
      const run = (variables: Record<string, unknown>, inputs: Record<string, unknown> = {}) =>
        evaluate(drain().condition, { variables, inputs, consts });
      const capped = { resume_after: 'trace-9', projected_s: 600 };

      expect(run(capped)).toBe(true);
      expect(run({ ...capped, resume_after: '' })).toBe(false);
      expect(run({ ...capped, projected_s: 1500 })).toBe(false);
      expect(run(capped, { dry_run: true })).toBe(false);
    });

    it('projects the next page to take as long as the last one', () => {
      const steps = drain().steps ?? [];
      const clock = findStep(steps, 'clock').with as Record<string, string>;
      const budget = findStep(steps, 'budget').with as Record<string, string>;
      const startedAt = Math.floor(Date.now() / 1000) - 300;
      const variables = { started_at: String(startedAt), elapsed_s: 100 };
      const after = {
        elapsed_s: Number(evaluate(clock.elapsed_s, { variables })),
        page_s: Number(evaluate(clock.page_s, { variables })),
      };

      expect(after.elapsed_s).toBeGreaterThanOrEqual(300);
      expect(after.page_s).toBeGreaterThanOrEqual(200);
      expect(Number(evaluate(budget.projected_s, { variables: after }))).toBe(
        after.elapsed_s + after.page_s
      );
    });

    it('adds the rounds of the pages up', () => {
      const page = findStep(pageSteps(render()), 'page').with as Record<string, string>;

      expect(
        evaluate(page.rounds, {
          variables: { rounds: 1000 },
          steps: { read_transcripts: { output: { memories: [1, 2, 3] } } },
        })
      ).toBe(1003);
    });

    it('queues the next run of the same workflow when it stopped at a cap, not on a dry run', () => {
      const more = findStep(render().steps, 'more_rounds');
      const [queue] = more.steps ?? [];

      expect(evaluate(more.condition, { variables: { resume_after: 'trace-9' }, inputs: {} })).toBe(
        true
      );
      expect(evaluate(more.condition, { variables: { resume_after: '' }, inputs: {} })).toBe(false);
      expect(
        evaluate(more.condition, {
          variables: { resume_after: 'trace-9' },
          inputs: { dry_run: true },
        })
      ).toBe(false);
      expect(queue).toEqual(
        expect.objectContaining({
          type: 'kibana.request',
          'on-failure': { continue: true },
          with: expect.objectContaining({
            method: 'POST',
            path: '/s/{{ workflow.spaceId }}/api/workflows/workflow/{{ consts.workflow_id }}/run',
          }),
        })
      );
    });
  });
});
