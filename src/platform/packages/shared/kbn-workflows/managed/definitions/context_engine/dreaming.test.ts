/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineDreamingWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

interface Step {
  name: string;
  type: string;
  condition?: string;
  steps?: Step[];
  with?: {
    memories?: string;
    collapse?: unknown;
    query?: { bool?: Record<string, unknown> };
    _source?: string[];
    [key: string]: unknown;
  };
}

const findStep = (steps: Step[], name: string): Step => {
  const step = steps.find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`No step named '${name}'`);
  }
  return step;
};

const values: ContextEngineDreamingWorkflowTemplateValues = {
  aiIndexId: 'support-cases',
  instanceKey: 'support-cases-0123456789abcdef',
  memoriesIndex: 'ai-index-idx-support-cases',
  intervalMinutes: 90,
  connectorId: 'my-connector',
  instructions: 'Remember what customers "prefer": seats, meals.\nSkip __FACT_TYPES__ and {{ x }}.',
  factTypes: [{ type: 'preference', description: 'Something a customer likes.' }],
  entityTypes: [
    { type: 'customer', description: 'A loyalty member.', attributes: ['loyalty_number', 'tier'] },
    { type: 'city' },
  ],
  relationshipTypes: [{ type: 'lives_in', source: 'customer', target: 'city' }],
};

const render = (overrides: Partial<ContextEngineDreamingWorkflowTemplateValues> = {}) =>
  parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate({ ...values, ...overrides }));

describe('CONTEXT_ENGINE_DREAMING_WORKFLOW', () => {
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

  it('names the instance after its AI index and keys its concurrency to it', () => {
    const workflow = render();

    expect(workflow.name).toBe('Dreaming: support-cases');
    expect(workflow.settings.concurrency).toEqual({
      key: 'context-engine-dreaming-support-cases-0123456789abcdef',
      strategy: 'drop',
      max: 1,
    });
  });

  it('runs on the configured schedule and on demand, and starts disabled', () => {
    const workflow = render();

    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '90m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
  });

  it('takes only optional inputs on demand, so a manual run needs no form', () => {
    const [, manual] = render().triggers;

    expect(Object.keys(manual.inputs.properties)).toEqual(['dry_run', 'since']);
    expect(manual.inputs).not.toHaveProperty('required');
  });

  it('reads memories since the given time when there is one, else since the last run', () => {
    const range = (
      findStep(render().steps, 'read_memories').with?.query?.bool?.filter as Array<{
        range?: { updated_at: { gte: string } };
      }>
    ).find((filter) => filter.range)?.range?.updated_at.gte;
    const engine = createWorkflowLiquidEngine();
    const steps = { last_run: { output: { since: '2026-11-01T00:00:00.000Z' } } };

    expect(engine.parseAndRenderSync(range ?? '', { inputs: {}, steps })).toBe(
      '2026-11-01T00:00:00.000Z'
    );
    expect(
      engine.parseAndRenderSync(range ?? '', {
        inputs: { since: '2026-10-01T00:00:00.000Z' },
        steps,
      })
    ).toBe('2026-10-01T00:00:00.000Z');
  });

  it('ends a dry run cancelled, so it does not move the window the next run reads', () => {
    const dryRun = findStep(render().steps, 'dry_run_result');

    expect(dryRun.condition).toBe('${{ inputs.dry_run == true }}');
    expect(dryRun.steps).toEqual([
      expect.objectContaining({ type: 'workflow.output', status: 'cancelled' }),
    ]);
  });

  it('passes dry_run to every write and totals what each batch did', () => {
    const batches = findStep(findStep(render().steps, 'dream').steps ?? [], 'batches');
    const apply = findStep(batches.steps ?? [], 'apply_changes');
    const tally = findStep(batches.steps ?? [], 'tally');
    const engine = createWorkflowLiquidEngine();
    const earlier = { id: 'fact-1', change: 'created', type: 'fact.policy', title: 'Refunds' };
    const later = { id: 'fact-2', change: 'deleted' };
    const tallied = (output: Record<string, unknown>) => {
      const scope = {
        variables: { created: 1, updated: 2, deleted: 0, rejected: 1, would_write: [earlier] },
        steps: { apply_changes: { output } },
      };
      return Object.fromEntries(
        Object.entries(tally.with ?? {}).map(([key, value]) => [
          key,
          engine.evalValueSync(String(value).slice(3, -2).trim(), scope),
        ])
      );
    };
    const counts = { created: 2, updated: 1, deleted: 1, rejected: [{ item: 'x', reason: 'y' }] };

    expect(apply.with).toEqual(
      expect.objectContaining({ dry_run: '${{ inputs.dry_run == true }}' })
    );
    expect(tallied({ ...counts, would_write: [later] })).toEqual({
      created: 3,
      updated: 3,
      deleted: 1,
      rejected: 2,
      would_write: [earlier, later],
    });
    expect(tallied(counts).would_write).toEqual([earlier]);
  });

  it('reports every batch of a dry run in one list', () => {
    const [output] = findStep(render().steps, 'dry_run_result').steps ?? [];

    expect(output.with).toEqual(
      expect.objectContaining({ would_write: '${{ variables.would_write }}' })
    );
  });

  describe('the consolidate prompt', () => {
    const memory = { id: 'm-1', type: 'memory.session_fact', title: 'Seat', content: 'Aisle.' };
    const existing = { id: 'fact-1', type: 'fact.preference', title: 'Bob likes aisles' };
    const deleted = {
      id: 'fact-2',
      type: 'fact.preference',
      title: 'Gone',
      governance: { lifecycle: { status: 'deleted' } },
    };

    const prompt = (overrides: Partial<ContextEngineDreamingWorkflowTemplateValues> = {}) => {
      const workflow = render(overrides);
      const batches = findStep(findStep(workflow.steps, 'dream').steps ?? [], 'batches');
      const consolidate = findStep(batches.steps ?? [], 'consolidate');
      return createWorkflowLiquidEngine().parseAndRenderSync(String(consolidate.with?.prompt), {
        consts: workflow.consts,
        foreach: { item: [memory] },
        steps: {
          read_existing: {
            output: { hits: { hits: [{ _source: existing }, { _source: deleted }] } },
          },
        },
      });
    };

    it('lists the configured types and instructions, then the memories and existing items', () => {
      const rendered = prompt();

      expect(rendered).toContain(
        'FACT TYPES:\n- preference: Something a customer likes.\nENTITY TYPES:\n'
      );
      expect(rendered).toContain(
        '- customer: A loyalty member. (attributes: loyalty_number, tier)\n- city\n'
      );
      expect(rendered).toContain('RELATIONSHIP TYPES:\n- lives_in: customer -> city\n');
      expect(rendered).toContain(`INSTRUCTIONS:\n\n${values.instructions}\n`);
      expect(rendered).toContain(`MEMORIES (one per line):\n${JSON.stringify(memory)}\n`);
      expect(rendered).toContain(JSON.stringify(existing));
      expect(rendered).not.toContain('"Gone"');
    });

    it('describes entities and relationships when entity types are configured', () => {
      const rendered = prompt();

      expect(rendered).toMatch(
        /^You consolidate short-term memories into long-term memory: entities/
      );
      expect(rendered).toContain('in its about field');
      expect(rendered).toContain('Give every entity a content summary');
      expect(rendered).toContain('On an entity, each references entry');
    });

    it('leaves entities out when none are configured', () => {
      const rendered = prompt({ entityTypes: [], relationshipTypes: [] });

      expect(rendered).toMatch(
        /^You consolidate short-term memories into long-term facts\.\n\nYou are given MEMORIES .* and EXISTING long-term facts\.\n\nA memory is/
      );
      expect(rendered).toContain(
        'ENTITY TYPES:\nnone: do not create entities.\nRELATIONSHIP TYPES:\nnone: do not create relationships.\n'
      );
      expect(rendered).toContain(
        'write a fact for each.\n\nGive an entity or fact access_patterns'
      );
      expect(rendered).toContain("How to read EXISTING: a fact's type is fact.");
      expect(rendered).not.toContain('about field');
      expect(rendered).not.toContain('content summary');
      expect(rendered).not.toContain('relates_to');
    });

    it('tells the model not to create facts when no fact types are configured', () => {
      expect(prompt({ factTypes: [] })).toContain(
        'FACT TYPES:\nnone: do not create facts.\nENTITY TYPES:'
      );
    });
  });

  it('keeps empty type lists as lists', () => {
    expect(render({ entityTypes: [], relationshipTypes: [] }).consts).toEqual(
      expect.objectContaining({ entity_types: [], relationship_types: [] })
    );
  });

  it('checks whether to dream before reading memories or calling a model', () => {
    const { steps } = render();

    expect(steps.map(({ name }: { name: string }) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'read_memories',
      'active',
      'dream',
      'dry_run_result',
      'output_result',
    ]);
    expect(steps[0].type).toBe('context-engine.getDreamingStatus');
  });

  it('cancels a paused run, so it does not move the window the next run reads', () => {
    const paused = findStep(render().steps, 'paused');

    expect(paused.condition).toBe('${{ steps.status.output.dream != true }}');
    expect(paused.steps).toEqual([
      expect.objectContaining({ type: 'workflow.output', status: 'cancelled' }),
    ]);
  });

  it('keeps tombstones in the memory query, so collapse returns each memory latest revision', () => {
    const readMemories = findStep(render().steps, 'read_memories').with;

    expect(readMemories?.collapse).toEqual({ field: 'id' });
    expect(readMemories?.query?.bool).not.toHaveProperty('must_not');
    expect(readMemories?._source).toContain('governance.lifecycle.status');
  });

  it('dreams only on memories that are not deleted', () => {
    const memories = findStep(render().steps, 'active').with?.memories ?? '';
    const hit = (id: string, status?: string) => ({
      _source: { id, ...(status && { governance: { lifecycle: { status } } }) },
    });
    const hits = [
      hit('m-1'),
      hit('m-2', 'deleted'),
      hit('m-3', 'active'),
      hit('m-4', 'verification_failed'),
    ];

    expect(memories.startsWith('${{') && memories.endsWith('}}')).toBe(true);
    expect(
      createWorkflowLiquidEngine().evalValueSync(memories.slice(3, -2).trim(), {
        steps: { read_memories: { output: { hits: { hits } } } },
      })
    ).toEqual([hits[0]._source, hits[2]._source]);
  });
});
