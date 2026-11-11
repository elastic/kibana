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
  foreach?: string;
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

  it('reads memories since the given time, else after the last memory the last run read, else since the last run', () => {
    const filters = findStep(render().steps, 'read_memories').with?.query?.bool
      ?.filter as unknown[];
    const window = filters.find((filter) => JSON.stringify(filter).includes('updated_at'));
    const engine = createWorkflowLiquidEngine();
    const lastRun = { output: { since: '2026-11-01T00:00:00.000Z' } };
    const lastOutput = (resumeFrom: string, resumeAfterId: string) => ({
      output: { context: { output: { resume_from: resumeFrom, resume_after_id: resumeAfterId } } },
    });
    const rendered = (scope: Record<string, unknown>) =>
      JSON.parse(engine.parseAndRenderSync(JSON.stringify(window), scope));
    const after = (since: string, afterId: string) => ({
      bool: {
        should: [
          { range: { updated_at: { gt: since } } },
          {
            bool: { filter: [{ term: { updated_at: since } }, { range: { id: { gt: afterId } } }] },
          },
        ],
        minimum_should_match: 1,
      },
    });

    expect(rendered({ inputs: {}, steps: { last_run: lastRun } })).toEqual(
      after('2026-11-01T00:00:00.000Z', '')
    );
    expect(
      rendered({ inputs: {}, steps: { last_run: lastRun, last_output: lastOutput('', '') } })
    ).toEqual(after('2026-11-01T00:00:00.000Z', ''));
    expect(
      rendered({
        inputs: {},
        steps: { last_run: lastRun, last_output: lastOutput('2026-10-20T00:00:00.000Z', 'm-9') },
      })
    ).toEqual(after('2026-10-20T00:00:00.000Z', 'm-9'));
    expect(
      rendered({
        inputs: { since: '2026-10-01T00:00:00.000Z' },
        steps: { last_run: lastRun, last_output: lastOutput('2026-10-20T00:00:00.000Z', 'm-9') },
      })
    ).toEqual(after('2026-10-01T00:00:00.000Z', ''));
  });

  it('reads the last run output only when it is not given a time and there is a last run', () => {
    const resume = findStep(render().steps, 'resume');
    const engine = createWorkflowLiquidEngine();
    const condition = (scope: Record<string, unknown>) =>
      engine.evalValueSync(String(resume.condition).slice(3, -2).trim(), scope);
    const lastRun = { output: { last_success: { execution_id: 'run-1' } } };

    expect(condition({ inputs: {}, steps: { last_run: lastRun } })).toBe(true);
    expect(condition({ inputs: {}, steps: { last_run: { output: {} } } })).toBe(false);
    expect(condition({ inputs: { since: '2026-10-01' }, steps: { last_run: lastRun } })).toBe(
      false
    );
    expect(resume.steps).toEqual([
      expect.objectContaining({
        type: 'kibana.request',
        with: expect.objectContaining({
          method: 'GET',
          query: { includeOutput: true, omitStepExecutions: true },
        }),
      }),
    ]);
  });

  it('outputs where to resume when it read as many memories as it can, and nothing otherwise', () => {
    const readMemories = findStep(render().steps, 'read_memories').with;
    const active = findStep(render().steps, 'active').with;
    const output = findStep(render().steps, 'output_result').with;
    const hits = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        _source: {
          id: `m-${index}`,
          updated_at: `2026-11-01T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
        },
      }));
    const rendered = (template: unknown, count: number) =>
      createWorkflowLiquidEngine().parseAndRenderSync(String(template), {
        steps: { read_memories: { output: { hits: { hits: hits(count) } } } },
      });
    const size = readMemories?.size as number;

    expect(readMemories?._source).toEqual(['updated_at', 'id']);
    expect(rendered(active?.resume_from, size)).toBe(hits(size).at(-1)?._source.updated_at);
    expect(rendered(active?.resume_after_id, size)).toBe(`m-${size - 1}`);
    expect(rendered(active?.resume_from, 3)).toBe('');
    expect(rendered(active?.resume_after_id, 3)).toBe('');
    expect(output).toEqual(
      expect.objectContaining({
        resume_from: '{{ variables.resume_from }}',
        resume_after_id: '{{ variables.resume_after_id }}',
      })
    );
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

    const prompt = (
      overrides: Partial<ContextEngineDreamingWorkflowTemplateValues> = {},
      {
        memories = [memory],
        existingItems = [existing, deleted],
      }: {
        memories?: Array<Record<string, unknown>>;
        existingItems?: Array<Record<string, unknown>>;
      } = {}
    ) => {
      const workflow = render(overrides);
      const batches = findStep(findStep(workflow.steps, 'dream').steps ?? [], 'batches');
      const consolidate = findStep(batches.steps ?? [], 'consolidate');
      return createWorkflowLiquidEngine().parseAndRenderSync(String(consolidate.with?.prompt), {
        consts: workflow.consts,
        foreach: { item: memories },
        steps: {
          read_existing: {
            output: { hits: { hits: existingItems.map((source) => ({ _source: source })) } },
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
      expect(rendered).toContain(`INSTRUCTIONS:\n\n${values.instructions}\n`);
      expect(rendered).toContain(`MEMORIES (one per line):\n${JSON.stringify(memory)}\n`);
      expect(rendered).toContain(JSON.stringify(existing));
      expect(rendered).not.toContain('"Gone"');
    });

    it('tells the model not to create a kind with no types configured', () => {
      expect(prompt({ entityTypes: [] })).toContain(
        'ENTITY TYPES:\nnone: do not create entities.\n\nINSTRUCTIONS:'
      );
      expect(prompt({ factTypes: [] })).toContain(
        'FACT TYPES:\nnone: do not create facts.\nENTITY TYPES:'
      );
    });

    it('describes only the kinds that are configured', () => {
      const all = prompt();
      const factsOnly = prompt({ entityTypes: [] });
      const entitiesOnly = prompt({ factTypes: [] });

      expect(all).toContain(
        'of the kinds configured below:\n- facts: separate pieces of knowledge, each readable on its own.\n- entities: the things the memories are about, each with a summary of what is known about it.\n\nYou are given'
      );
      expect(factsOnly).toContain(
        'of the kinds configured below:\n- facts: separate pieces of knowledge, each readable on its own.\n\nYou are given'
      );
      expect(factsOnly).toContain('keep every name, number, code and date exactly as stated');
      expect(factsOnly).toContain('write a fact for each');
      expect(factsOnly).not.toContain('Give every entity a content summary');
      expect(entitiesOnly).toContain(
        'of the kinds configured below:\n- entities: the things the memories are about, each with a summary of what is known about it.\n\nYou are given'
      );
      expect(entitiesOnly).toContain('Give every entity a content summary');
      expect(entitiesOnly).not.toContain('Facts are read on their own');
    });

    it('shows only the existing items with the same permissions as the memories', () => {
      const audience = (name: string) => ({
        kibana: { privileges: [{ space: 'default', name: [name], count: 1 }] },
      });
      const open = { id: 'fact-open', type: 'fact.preference', title: 'Open' };
      const teamA = { ...open, id: 'fact-a', permissions: audience('ai_index:a/read') };
      const teamB = { ...open, id: 'fact-b', permissions: audience('ai_index:b/read') };
      const shown = (memories: Array<Record<string, unknown>>) => {
        const rendered = prompt({}, { memories, existingItems: [open, teamA, teamB] });
        return rendered.slice(rendered.indexOf('EXISTING'));
      };

      const forOpen = shown([memory]);
      const forTeamA = shown([{ ...memory, permissions: teamA.permissions }]);

      expect(forOpen).toContain('"fact-open"');
      expect(forOpen).not.toMatch(/"fact-a"|"fact-b"/);
      expect(forTeamA).toContain('"fact-a"');
      expect(forTeamA).not.toMatch(/"fact-open"|"fact-b"/);
    });

    it('never asks for relationships or links between items', () => {
      const rendered = prompt();

      expect(rendered).not.toMatch(/relationship|relates_to|about field/i);
    });
  });

  it('batches only memories with the same permissions, 20 at a time', () => {
    const batches = findStep(findStep(render().steps, 'dream').steps ?? [], 'batches');
    const audience = (name: string) => ({
      kibana: { privileges: [{ space: 'default', name: [name], count: 1 }] },
    });
    const open = Array.from({ length: 30 }, (_, index) => ({ id: `open-${index}` }));
    const memories = [
      ...open,
      { id: 'a-1', permissions: audience('ai_index:a/read') },
      { id: 'b-1', permissions: audience('ai_index:b/read') },
      { id: 'a-2', permissions: audience('ai_index:a/read') },
    ];
    const rendered: Array<Array<{ id: string }>> = JSON.parse(
      createWorkflowLiquidEngine().parseAndRenderSync(String(batches.foreach), {
        variables: { memories },
      })
    );

    expect(rendered.map((batch) => batch.map(({ id }) => id))).toEqual([
      open.slice(0, 20).map(({ id }) => id),
      open.slice(20).map(({ id }) => id),
      ['a-1', 'a-2'],
      ['b-1'],
    ]);
  });

  it('reads existing facts and entities with what each is for', () => {
    const batches = findStep(findStep(render().steps, 'dream').steps ?? [], 'batches');
    const readExisting = findStep(batches.steps ?? [], 'read_existing').with;

    expect(readExisting?._source).toEqual(expect.arrayContaining(['description', 'content']));
    expect(readExisting?.query?.bool?.should).toEqual([
      { prefix: { type: 'fact.' } },
      { prefix: { type: 'entity.' } },
    ]);
  });

  it('asks the model for entities and facts, and nothing else', () => {
    const batches = findStep(findStep(render().steps, 'dream').steps ?? [], 'batches');
    const { schema } = findStep(batches.steps ?? [], 'consolidate').with as {
      schema: {
        properties: Record<string, { items: { properties: Record<string, unknown> } }>;
        required: string[];
      };
    };

    expect(Object.keys(schema.properties)).toEqual(['entities', 'facts']);
    expect(schema.required).toEqual(['entities', 'facts']);
  });

  it('names every item by its title, as EXISTING shows it', () => {
    const batches = findStep(findStep(render().steps, 'dream').steps ?? [], 'batches');
    const { schema } = findStep(batches.steps ?? [], 'consolidate').with as {
      schema: { properties: Record<string, { items: { properties: Record<string, unknown> } }> };
    };

    for (const { items } of Object.values(schema.properties)) {
      expect(items.properties).toHaveProperty('title');
      expect(items.properties).not.toHaveProperty('name');
    }
  });

  it('keeps empty type lists as lists', () => {
    expect(render({ factTypes: [], entityTypes: [] }).consts).toEqual(
      expect.objectContaining({ fact_types: [], entity_types: [] })
    );
  });

  it('checks whether to dream before reading memories or calling a model', () => {
    const { steps } = render();

    expect(steps.map(({ name }: { name: string }) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'resume',
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

  it('keeps tombstones and expired revisions in the memory query, so collapse finds each memory latest revision', () => {
    const readMemories = findStep(render().steps, 'read_memories').with;

    expect(readMemories?.sort).toEqual([{ updated_at: 'asc' }, { id: 'asc' }]);
    expect(readMemories?.collapse).toEqual({
      field: 'id',
      inner_hits: expect.objectContaining({
        name: 'latest',
        size: 1,
        sort: [{ updated_at: 'desc' }],
        _source: expect.arrayContaining(['governance.lifecycle.status', 'permissions']),
        docvalue_fields: [{ field: 'expires_at', format: 'strict_date_time' }],
      }),
    });
    expect(readMemories?.query?.bool).not.toHaveProperty('must_not');
    expect(JSON.stringify(readMemories?.query)).not.toContain('expires_at');
  });

  it('dreams only on the latest revisions that are neither deleted nor expired, oldest first', () => {
    const memories = findStep(render().steps, 'active').with?.memories ?? '';
    const latest = (
      id: string,
      { status, expiresAt }: { status?: string; expiresAt?: string } = {}
    ) => ({
      inner_hits: {
        latest: {
          hits: {
            hits: [
              {
                _source: { id, ...(status && { governance: { lifecycle: { status } } }) },
                ...(expiresAt && { fields: { expires_at: [expiresAt] } }),
              },
            ],
          },
        },
      },
    });
    const hits = [
      latest('m-1'),
      latest('m-2', { status: 'deleted' }),
      latest('m-3', { status: 'active', expiresAt: '2026-12-01T00:00:00.000Z' }),
      latest('m-4', { status: 'verification_failed' }),
      latest('m-5', { expiresAt: '2026-11-01T00:00:00.000Z' }),
    ];

    expect(memories.startsWith('${{') && memories.endsWith('}}')).toBe(true);
    expect(
      createWorkflowLiquidEngine().evalValueSync(memories.slice(3, -2).trim(), {
        execution: { startedAt: '2026-11-09T12:00:00.000Z' },
        steps: { read_memories: { output: { hits: { hits } } } },
      })
    ).toEqual([{ id: 'm-1' }, { id: 'm-3', governance: { lifecycle: { status: 'active' } } }]);
  });
});
