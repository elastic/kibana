/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineDreamingBatchWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_DREAMING_BATCH_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

interface Step {
  name: string;
  type: string;
  condition?: string;
  'on-failure'?: { continue?: boolean };
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

const values: ContextEngineDreamingBatchWorkflowTemplateValues = {
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
  relationshipTypes: [
    { type: 'lives_in', description: 'A customer lives in a city.' },
    { type: 'knows' },
  ],
};

const render = (overrides: Partial<ContextEngineDreamingBatchWorkflowTemplateValues> = {}) =>
  parse(CONTEXT_ENGINE_DREAMING_BATCH_WORKFLOW.yamlTemplate({ ...values, ...overrides }));

describe('CONTEXT_ENGINE_DREAMING_BATCH_WORKFLOW', () => {
  it('is a workflow of its own that only a parent run starts, named for its AI index', () => {
    const workflow = render();

    expect(workflow.name).toBe('Dreaming batch: support-cases');
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      expect.objectContaining({
        type: 'manual',
        inputs: expect.objectContaining({ required: ['memories'] }),
      }),
    ]);
    expect(workflow.settings).not.toHaveProperty('concurrency');
  });

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

  it('loads the latest revision of each memory of the batch, with its content, by id', () => {
    const steps = render().steps as Step[];
    const read = findStep(steps, 'read_batch').with;
    const engine = createWorkflowLiquidEngine();

    expect(steps[0].name).toBe('read_batch');
    expect(read?._source).toEqual(
      expect.arrayContaining([
        'id',
        'title',
        'content',
        'permissions',
        'governance.lifecycle.status',
      ])
    );
    expect(read?.sort).toEqual([{ updated_at: 'desc' }]);
    expect(read?.collapse).toEqual({ field: 'id' });
    expect(read?.size).toBeGreaterThanOrEqual(100);
    expect(
      engine.evalValueSync(
        String((read?.query?.bool?.filter as Array<{ terms: { id: string } }>)[0].terms.id)
          .slice(3, -2)
          .trim(),
        { inputs: { memories: [{ id: 'm-1' }, { id: 'm-2' }] } }
      )
    ).toEqual(['m-1', 'm-2']);
  });

  it('passes the memories it was given to the write, as they were read, and outputs what it did', () => {
    const steps = render().steps as Step[];
    const apply = findStep(steps, 'apply_changes');

    expect(steps.map(({ name }) => name)).toEqual([
      'read_batch',
      'read_existing',
      'consolidate',
      'apply_changes',
      'batch_output',
    ]);
    expect(apply.with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      memories: '${{ inputs.memories }}',
      changes: '${{ steps.consolidate.output.content }}',
      dry_run: '${{ inputs.dry_run == true }}',
    });
    expect(findStep(steps, 'consolidate')['on-failure']).toEqual({
      retry: { 'max-attempts': 2, delay: '30s' },
    });
    expect(findStep(steps, 'batch_output').with).toEqual(
      expect.objectContaining({
        created: '${{ steps.apply_changes.output.created | default: 0 }}',
        rejected: '${{ steps.apply_changes.output.rejected | size | default: 0 }}',
      })
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
      overrides: Partial<ContextEngineDreamingBatchWorkflowTemplateValues> = {},
      {
        memories = [memory],
        existingItems = [existing, deleted],
      }: {
        memories?: Array<Record<string, unknown>>;
        existingItems?: Array<Record<string, unknown>>;
      } = {}
    ) => {
      const workflow = render(overrides);
      const consolidate = findStep(workflow.steps, 'consolidate');
      return createWorkflowLiquidEngine().parseAndRenderSync(String(consolidate.with?.prompt), {
        consts: workflow.consts,
        inputs: { memories: memories.map(({ permissions }) => ({ permissions })) },
        steps: {
          read_batch: {
            output: { hits: { hits: memories.map((source) => ({ _source: source })) } },
          },
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

    it('tells the model to leave a person-edited item as it is', () => {
      expect(prompt()).toContain(
        'An EXISTING item with attributes["memory.edited_by"] was edited by a person, and its text cannot change. When a memory changes or contradicts what it says, write what the memory says as a new item, and do not return the edited item\'s ref for that memory.'
      );
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

  it('reads the existing facts and entities most like the batch first, not the newest ones', () => {
    const readExisting = findStep(render().steps, 'read_existing').with;
    const bool = readExisting?.query?.bool as {
      filter: Array<Record<string, unknown>>;
      should: Array<Record<string, any>>;
    };
    const engine = createWorkflowLiquidEngine();
    const scope = {
      inputs: { memories: [{ id: 'm-1' }, { id: 'm-2' }] },
      steps: {
        read_batch: {
          output: {
            hits: {
              hits: [
                { _source: { id: 'm-1', title: 'Seat', content: 'Bob wants an aisle seat.' } },
                { _source: { id: 'm-2', title: 'Meal', content: 'Bob is vegetarian.' } },
              ],
            },
          },
        },
      },
    };
    const [cited, title, content] = bool.should;

    expect(readExisting?._source).toEqual(expect.arrayContaining(['description', 'content']));
    expect(readExisting?.size).toBe(300);
    expect(readExisting?.sort).toEqual([{ _score: 'desc' }, { updated_at: 'desc' }]);
    expect(readExisting?.collapse).toEqual({ field: 'id' });
    expect(bool.filter[0]).toEqual({
      bool: {
        should: [
          { prefix: { type: { value: 'fact.' } } },
          { prefix: { type: { value: 'entity.' } } },
        ],
        minimum_should_match: 1,
      },
    });
    expect(bool).not.toHaveProperty('minimum_should_match');
    expect(
      engine.evalValueSync(String(cited.terms['references.uri']).slice(3, -2).trim(), scope)
    ).toEqual(['ki://m-1', 'ki://m-2']);
    expect(cited.terms.boost).toBeGreaterThan(1);
    expect(engine.parseAndRenderSync(title.match.title.query, scope)).toBe('Seat Meal');
    expect(engine.parseAndRenderSync(content.match.content.query, scope)).toBe(
      'Bob wants an aisle seat. Bob is vegetarian.'
    );
  });

  it('keeps what it searches by within a bound, however large its memories are', () => {
    const bool = findStep(render().steps, 'read_existing').with?.query?.bool as {
      should: Array<Record<string, any>>;
    };
    const hits = Array.from({ length: 100 }, (_, index) => ({
      _source: {
        id: `m-${index}`,
        title: `Title ${index} `.repeat(100),
        content: 'word '.repeat(4000),
      },
    }));
    const scope = { steps: { read_batch: { output: { hits: { hits } } } } };
    const engine = createWorkflowLiquidEngine();

    expect(
      engine.parseAndRenderSync(bool.should[1].match.title.query, scope).length
    ).toBeLessThanOrEqual(1003);
    expect(
      engine.parseAndRenderSync(bool.should[2].match.content.query, scope).length
    ).toBeLessThanOrEqual(3003);
  });

  it('renders the prompt of a full batch of large memories well within the Liquid render time limit', () => {
    const workflow = render();
    const consolidate = findStep(workflow.steps, 'consolidate');
    const audience = {
      kibana: { privileges: [{ space: 'default', name: ['ai_index:a/read'], count: 1 }] },
    };
    const memory = (index: number) => ({
      id: `m-${index}`,
      type: 'memory.session',
      title: `Session ${index}`,
      content: `Session ${index}: ${'The customer asked about seats, meals and refunds. '.repeat(
        400
      )}`,
      updated_at: '2026-11-01T00:00:00.000Z',
      attributes: { source: 'chat' },
      permissions: audience,
    });
    const existing = (index: number) => ({
      id: `fact-${index}`,
      type: 'fact.preference',
      title: `Fact ${index}`,
      content: 'The customer prefers aisle seats. '.repeat(100),
      permissions: audience,
    });
    const memories = Array.from({ length: 100 }, (_, index) => memory(index));
    const engine = createWorkflowLiquidEngine();

    const startedAt = Date.now();
    const rendered = engine.parseAndRenderSync(String(consolidate.with?.prompt), {
      consts: workflow.consts,
      inputs: { memories: memories.map(({ id, permissions }) => ({ id, permissions })) },
      steps: {
        read_batch: { output: { hits: { hits: memories.map((_source) => ({ _source })) } } },
        read_existing: {
          output: {
            hits: {
              hits: Array.from({ length: 300 }, (_, index) => ({ _source: existing(index) })),
            },
          },
        },
      },
    });
    const elapsed = Date.now() - startedAt;

    expect(rendered.length).toBeGreaterThan(100 * 20 * 1024);
    expect(rendered).toContain('"m-99"');
    expect(rendered).toContain('"fact-299"');
    expect(elapsed).toBeLessThan(1000);
  });

  it('asks the model for entities and facts, and nothing else', () => {
    const { schema } = findStep(render().steps, 'consolidate').with as {
      schema: {
        properties: Record<string, { items: { properties: Record<string, unknown> } }>;
        required: string[];
      };
    };

    expect(Object.keys(schema.properties)).toEqual(['entities', 'facts']);
    expect(schema.required).toEqual(['entities', 'facts']);
  });

  it('names every item by its title, as EXISTING shows it', () => {
    const { schema } = findStep(render().steps, 'consolidate').with as {
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

  it('builds no relationships: the relationships workflow links what dreaming writes', () => {
    expect(CONTEXT_ENGINE_DREAMING_BATCH_WORKFLOW.yamlTemplate(values)).not.toMatch(
      /relationship/i
    );
  });
});
