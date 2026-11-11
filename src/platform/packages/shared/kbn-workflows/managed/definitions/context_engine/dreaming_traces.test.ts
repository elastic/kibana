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

interface Step {
  name: string;
  type: string;
  condition?: string;
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
const batchSteps = () => batches().steps ?? [];

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

  it('writes the dreaming config into the consts exactly as given', () => {
    expect(render().consts).toEqual({
      ai_index_id: 'support-cases',
      memories_index: 'ai-index-idx-support-cases',
      connector_id: 'my-connector',
      instructions: values.instructions,
      fact_types: values.factTypes,
      entity_types: values.entityTypes,
      relationship_types: values.relationshipTypes,
    });
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

  it('extracts from batches of 5 rounds that share permissions, and applies the changes citing them', () => {
    const round = (id: string, space: string) => ({
      id,
      permissions: { kibana: { privileges: [{ space }] } },
    });
    const rendered = JSON.parse(
      createWorkflowLiquidEngine().parseAndRenderSync(String(batches().foreach), {
        variables: {
          memories: [
            ...Array.from({ length: 7 }, (_, i) => round(`a-${i}`, 'team-a')),
            round('b', 'team-b'),
          ],
        },
      })
    ) as unknown[][];

    expect(rendered.map((batch) => batch.length)).toEqual([5, 2, 1]);
    expect(batchSteps().map(({ name }) => name)).toEqual([
      'read_existing',
      'extract',
      'apply_changes',
      'tally',
      'relationships',
    ]);
    expect(findStep(batchSteps(), 'apply_changes').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      memories: '${{ foreach.item }}',
      changes: '${{ steps.extract.output.content }}',
      dry_run: '${{ inputs.dry_run == true }}',
    });
  });

  it('links what each batch writes with the same relationships step as dreaming, and counts them', () => {
    const dreamingBatches = findStep(
      findStep(parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values)).steps, 'dream').steps ??
        [],
      'batches'
    );

    expect(findStep(batchSteps(), 'relationships')).toEqual(
      findStep(dreamingBatches.steps ?? [], 'relationships')
    );
    expect(findStep(render().steps, 'output_result').with).toEqual(
      expect.objectContaining({
        relationships_created: '${{ variables.relationships_created | default: 0 }}',
        relationships_updated: '${{ variables.relationships_updated | default: 0 }}',
        relationships_deleted: '${{ variables.relationships_deleted | default: 0 }}',
        relationships_rejected: '${{ variables.relationships_rejected | default: 0 }}',
      })
    );
  });

  it('shows the model each round and the configured types', () => {
    const prompt = String(findStep(batchSteps(), 'extract').with?.prompt);
    const round = {
      id: 'trace:51fff8a2',
      type: 'trace.round',
      title: 'Agent conversation with Elastic AI Agent, round ending 2026-11-11T13:12:03.357Z',
      content: 'User: I always want vegetarian meals.\nAssistant: Noted.',
      permissions: { kibana: { privileges: [{ space: 'default' }] } },
    };

    const rendered = createWorkflowLiquidEngine().parseAndRenderSync(prompt, {
      consts: render().consts,
      foreach: { item: [round] },
      steps: { read_existing: { output: { hits: { hits: [] } } } },
    });

    expect(rendered).toContain(
      'You extract long-term memory from the conversations users had with agents'
    );
    expect(rendered).toContain('A tool result is evidence');
    expect(rendered).toContain(JSON.stringify(round));
    expect(rendered).toContain('- preference: Something a customer likes.');
    expect(rendered).toContain('- customer (attributes: tier)');
    expect(rendered).toContain(values.instructions);
    expect(rendered).not.toMatch(/relationship|relates_to/i);
  });
});
