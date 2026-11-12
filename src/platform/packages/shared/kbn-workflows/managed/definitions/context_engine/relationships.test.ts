/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineRelationshipsWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW, CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

interface Step {
  name: string;
  type: string;
  condition?: string;
  'on-failure'?: { continue?: boolean; retry?: unknown };
  foreach?: string;
  steps?: Step[];
  with?: {
    collapse?: unknown;
    query?: { bool?: Record<string, unknown> };
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

const values: ContextEngineRelationshipsWorkflowTemplateValues = {
  aiIndexId: 'support-cases',
  instanceKey: 'support-cases-0123456789abcdef',
  memoriesIndex: 'ai-index-idx-support-cases',
  intervalMinutes: 90,
  connectorId: 'my-connector',
  instructions: 'Remember what customers "prefer".\nSkip {{ small talk }}.',
  factTypes: [{ type: 'preference', description: 'Something a customer likes.' }],
  entityTypes: [{ type: 'customer', attributes: ['tier'] }, { type: 'city' }],
  relationshipTypes: [
    { type: 'lives_in', description: 'A customer lives in a city.' },
    { type: 'knows' },
  ],
};

const render = () => parse(CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW.yamlTemplate(values));
const batches = () => findStep(findStep(render().steps, 'link').steps ?? [], 'batches');
const batchSteps = () => batches().steps ?? [];
const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
  createWorkflowLiquidEngine().evalValueSync(String(expression).slice(3, -2).trim(), scope);
const hits = (sources: Array<Record<string, unknown>>) => ({
  output: { hits: { hits: sources.map((source) => ({ _source: source })) } },
});
const latestHits = (sources: Array<Record<string, unknown>>) => ({
  output: {
    hits: {
      hits: sources.map((source) => ({
        _source: { id: source.id },
        inner_hits: { latest: { hits: { hits: [{ _source: source }] } } },
      })),
    },
  },
});

const audience = { kibana: { privileges: [{ space: 'default' }] } };
const bob = {
  id: 'entity-customer--bob',
  type: 'entity.customer',
  title: 'Bob',
  permissions: audience,
};
const lyon = {
  id: 'entity-city--lyon',
  type: 'entity.city',
  title: 'Lyon',
  description: 'A city.',
  permissions: audience,
};
const paris = {
  id: 'entity-city--paris',
  type: 'entity.city',
  title: 'Paris',
  permissions: audience,
};
const fact = {
  id: 'fact-1',
  type: 'fact.preference',
  title: 'Bob likes aisles',
  content: 'Bob prefers aisle seats.',
  permissions: audience,
};
const olderFact = {
  id: 'fact-0',
  type: 'fact.preference',
  title: 'Bob avoids layovers',
  content: 'Bob books direct flights only.',
  permissions: audience,
};

const prompt = ({
  items = [bob, fact] as Array<Record<string, unknown>>,
  entities = [bob, lyon, paris] as Array<Record<string, unknown>>,
  facts = [] as Array<Record<string, unknown>>,
  relationships = [] as Array<Record<string, unknown>>,
} = {}) =>
  createWorkflowLiquidEngine().parseAndRenderSync(
    String(findStep(batchSteps(), 'relate').with?.prompt),
    {
      consts: render().consts,
      foreach: { item: items },
      steps: {
        read_entities: hits(entities),
        read_facts: latestHits(facts),
        read_relationships: hits(relationships),
      },
    }
  );
const section = (rendered: string, start: string, end: string) =>
  rendered.slice(rendered.indexOf(start), rendered.indexOf(end));

describe('CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW', () => {
  it('is its own workflow on the dreaming schedule, named and keyed apart from dreaming', () => {
    const workflow = render();
    const dreaming = parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values));

    expect(workflow.name).toBe('Relationships: support-cases');
    expect(workflow.settings.concurrency.key).toBe(
      'context-engine-relationships-support-cases-0123456789abcdef'
    );
    expect(workflow.settings.concurrency.key).not.toBe(dreaming.settings.concurrency.key);
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '90m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('writes the relationship types and instructions into the consts exactly as given', () => {
    expect(render().consts).toEqual({
      ai_index_id: 'support-cases',
      memories_index: 'ai-index-idx-support-cases',
      connector_id: 'my-connector',
      instructions: values.instructions,
      relationship_types: values.relationshipTypes,
    });
  });

  it('checks the AI index links relationships before reading items or calling a model', () => {
    const { steps } = render();

    expect(steps.map(({ name }: Step) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'resume',
      'read_items',
      'active',
      'link',
      'dry_run_result',
      'output_result',
    ]);
    expect(steps[0]).toEqual(
      expect.objectContaining({
        type: 'context-engine.getDreamingStatus',
        with: { ai_index_id: '{{ consts.ai_index_id }}', source: 'relationships' },
      })
    );
    expect(findStep(steps, 'paused').steps).toEqual([
      expect.objectContaining({ type: 'workflow.output', status: 'cancelled' }),
    ]);
  });

  it('reads the facts and entities that changed since the cursor, the latest revision of each', () => {
    const read = findStep(render().steps, 'read_items').with;
    const [types, window] = (read?.query?.bool?.filter ?? []) as Array<Record<string, unknown>>;
    const engine = createWorkflowLiquidEngine();
    const since = (
      window as { bool: { should: Array<{ range?: { updated_at: { gt: string } } }> } }
    ).bool.should[0].range?.updated_at.gt;

    expect(types).toEqual({
      bool: {
        should: [{ prefix: { type: 'fact.' } }, { prefix: { type: 'entity.' } }],
        minimum_should_match: 1,
      },
    });
    expect(read?.sort).toEqual([{ updated_at: 'asc' }, { id: 'asc' }]);
    expect(read?.collapse).toEqual(
      expect.objectContaining({ field: 'id', inner_hits: expect.objectContaining({ size: 1 }) })
    );
    expect(
      engine.parseAndRenderSync(String(since), {
        inputs: {},
        steps: {
          last_run: { output: { since: '2026-11-01T00:00:00.000Z' } },
          last_output: { output: { context: { output: { resume_from: '2026-11-03T00:00:00Z' } } } },
        },
      })
    ).toBe('2026-11-03T00:00:00Z');
  });

  it('links only the latest revisions that are neither deleted nor failed verification', () => {
    const items = findStep(render().steps, 'active').with?.items;
    const latest = (id: string, status?: string) => ({
      inner_hits: {
        latest: {
          hits: {
            hits: [{ _source: { id, ...(status && { governance: { lifecycle: { status } } }) } }],
          },
        },
      },
    });

    expect(
      evaluate(items, {
        steps: {
          read_items: {
            output: {
              hits: {
                hits: [
                  latest('fact-1'),
                  latest('fact-2', 'deleted'),
                  latest('entity-3', 'verification_failed'),
                ],
              },
            },
          },
        },
      })
    ).toEqual([{ id: 'fact-1' }]);
  });

  it('links batches of items that share permissions, without memories, and adds up what each wrote', () => {
    const steps = batchSteps();
    const rendered = JSON.parse(
      createWorkflowLiquidEngine().parseAndRenderSync(String(batches().foreach), {
        variables: {
          items: [
            ...Array.from({ length: 27 }, (_, i) => ({ id: `a-${i}`, permissions: audience })),
            { id: 'b', permissions: { kibana: { privileges: [{ space: 'team-b' }] } } },
          ],
        },
      })
    ) as unknown[][];

    expect(rendered.map((batch) => batch.length)).toEqual([25, 2, 1]);
    expect(steps.map(({ name }) => name)).toEqual([
      'read_entities',
      'read_relationships',
      'mentions',
      'read_facts',
      'relate',
      'apply_relationships',
      'tally',
    ]);
    expect(findStep(steps, 'apply_relationships').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      items: '${{ foreach.item | map: "id" }}',
      changes: '${{ steps.relate.output.content }}',
      dry_run: '${{ inputs.dry_run == true }}',
    });
    expect(
      evaluate(findStep(steps, 'apply_relationships').with?.items, {
        foreach: { item: [bob, fact] },
      })
    ).toEqual([bob.id, fact.id]);

    const tally = findStep(steps, 'tally').with ?? {};
    const scope = {
      variables: { created: 1, updated: 0, deleted: 0, rejected: 2, would_write: [] },
      steps: {
        apply_relationships: {
          output: { created: 2, updated: 1, deleted: 1, rejected: [{}], would_write: [] },
        },
      },
    };
    expect(
      Object.fromEntries(Object.entries(tally).map(([key, value]) => [key, evaluate(value, scope)]))
    ).toEqual({ created: 3, updated: 1, deleted: 1, rejected: 3, would_write: [] });
  });

  it('retries the model call and fails the run otherwise, so the next run links the same items', () => {
    const relate = findStep(batchSteps(), 'relate');

    expect(relate['on-failure']).toEqual({ retry: { 'max-attempts': 2, delay: '30s' } });
    expect(findStep(batchSteps(), 'apply_relationships')['on-failure']).toBeUndefined();
  });

  it('reads the relationships of the batch items', () => {
    const read = findStep(batchSteps(), 'read_relationships').with;
    const [type, uris] = (read?.query?.bool?.filter ?? []) as Array<{
      terms?: Record<string, unknown>;
    }>;

    expect(type).toEqual({ term: { type: 'memory.relationship' } });
    expect(evaluate(uris.terms?.['references.uri'], { foreach: { item: [bob, lyon] } })).toEqual([
      'ki://entity-customer--bob',
      'ki://entity-city--lyon',
    ]);
    expect(read?.collapse).toEqual({ field: 'id' });
  });

  it('lists the relationship types, the items, and the other entities they could link to', () => {
    const rendered = prompt();
    const pick = ({ id, type, title, description }: Record<string, unknown>) =>
      JSON.stringify({ id, type, title, ...(description !== undefined && { description }) });

    expect(rendered).toContain(
      'RELATIONSHIP TYPES:\n- about: A fact is about an entity. Built in; the only type for facts.\n- lives_in: A customer lives in a city.\n- knows\n'
    );
    expect(rendered).toContain(`INSTRUCTIONS:\n\n${values.instructions}\n`);
    expect(rendered).toContain(
      `ITEMS (one per line):\n${JSON.stringify({
        id: bob.id,
        type: bob.type,
        title: bob.title,
      })}\n${JSON.stringify({
        id: fact.id,
        type: fact.type,
        title: fact.title,
        content: fact.content,
      })}\n`
    );
    expect(rendered).toContain(
      `EXISTING ENTITIES (one per line, none when empty):\n${pick(lyon)}\n${pick(paris)}\n`
    );
  });

  it('leaves out entities that are items, deleted, or seen by other people', () => {
    const restricted = {
      ...paris,
      permissions: {
        kibana: { privileges: [{ space: 'default', name: ['ai_index:a/read'], count: 1 }] },
      },
    };
    const deleted = { ...lyon, governance: { lifecycle: { status: 'deleted' } } };
    const rendered = prompt({ entities: [bob, deleted, restricted] });

    expect(section(rendered, 'EXISTING ENTITIES (', 'EXISTING FACTS (')).toBe(
      'EXISTING ENTITIES (one per line, none when empty):\n\n'
    );
  });

  it('searches the facts that name an entity of the batch, other than the user, and none for a batch without such entities', () => {
    const engine = createWorkflowLiquidEngine();
    const clauses = String(findStep(batchSteps(), 'mentions').with?.mention_clauses);
    const quoted = { ...lyon, title: 'Lyon "Presqu\'île"' };
    const user = { id: 'entity-user--user', type: 'entity.user', title: 'User' };
    const mentionsOf = (items: Array<Record<string, unknown>>) =>
      JSON.parse(engine.parseAndRenderSync(clauses, { foreach: { item: items } }));

    expect(mentionsOf([user, bob, fact, quoted])).toEqual([
      { match_phrase: { title: 'Bob' } },
      { match_phrase: { content: 'Bob' } },
      { match_phrase: { title: quoted.title } },
      { match_phrase: { content: quoted.title } },
    ]);
    expect(mentionsOf([fact])).toEqual([{ match_none: {} }]);
    expect(mentionsOf([user, fact])).toEqual([{ match_none: {} }]);
    expect(
      mentionsOf([
        { ...paris, title: undefined },
        { ...paris, title: null },
        { ...paris, title: '' },
        { ...paris, title: '  ' },
      ])
    ).toEqual([{ match_none: {} }]);

    const bool = findStep(batchSteps(), 'read_facts').with?.query?.bool ?? {};
    expect(
      evaluate(bool.should, {
        variables: { mention_clauses: '[{"match_phrase":{"title":"Bob"}}]' },
      })
    ).toEqual([{ match_phrase: { title: 'Bob' } }]);
    expect(bool.minimum_should_match).toBe(1);
  });

  it('reads up to 100 matching facts, best match first, with the latest revision of each', () => {
    const read = findStep(batchSteps(), 'read_facts').with;

    expect(read?.size).toBe(100);
    expect(read?.sort).toBeUndefined();
    expect(read?.query?.bool?.filter).toEqual(
      expect.arrayContaining([{ prefix: { type: 'fact.' } }])
    );
    expect(
      evaluate((read?.query?.bool?.must_not as Array<{ terms: { id: string } }>)[0].terms.id, {
        foreach: { item: [bob, fact] },
      })
    ).toEqual([bob.id, fact.id]);
    expect(read?.collapse).toEqual(
      expect.objectContaining({
        field: 'id',
        inner_hits: expect.objectContaining({ size: 1, sort: [{ updated_at: 'desc' }] }),
      })
    );
  });

  it('lists the existing facts that could be about an entity of the batch', () => {
    const restricted = {
      ...olderFact,
      id: 'fact-restricted',
      permissions: { kibana: { privileges: [{ space: 'team-b' }] } },
    };
    const deleted = {
      ...olderFact,
      id: 'fact-deleted',
      governance: { lifecycle: { status: 'deleted' } },
    };
    const failed = {
      ...olderFact,
      id: 'fact-failed',
      governance: { lifecycle: { status: 'verification_failed' } },
    };
    const rendered = prompt({ facts: [olderFact, fact, restricted, deleted, failed] });

    expect(section(rendered, 'EXISTING FACTS (', 'EXISTING RELATIONSHIPS (')).toBe(
      `EXISTING FACTS (one per line, none when empty):\n${JSON.stringify({
        id: olderFact.id,
        type: olderFact.type,
        title: olderFact.title,
        content: olderFact.content,
      })}\n\n`
    );
    expect(rendered).toContain(
      '- Link an EXISTING FACT only to an entity in ITEMS that it is about.'
    );
  });

  it('shows each existing relationship by its ends and type', () => {
    const relationship = {
      id: 'relationship-1',
      description: 'Bob moved to Lyon in 2024.',
      attributes: {
        'relationship.relation': 'lives_in',
        'memory.key': `${bob.id}|lives_in|${lyon.id}`,
      },
      permissions: audience,
    };
    const deleted = {
      ...relationship,
      id: 'relationship-2',
      governance: { lifecycle: { status: 'deleted' } },
    };

    expect(prompt({ relationships: [relationship, deleted] })).toContain(
      `EXISTING RELATIONSHIPS (one per line, none when empty):\n{"from": "${bob.id}", "relation": "lives_in", "to": "${lyon.id}", "description": "Bob moved to Lyon in 2024."}\n`
    );
  });

  it('asks only for relationships between two items, to create, update or delete', () => {
    const { schema } = findStep(batchSteps(), 'relate').with as {
      schema: {
        properties: {
          relationships: { items: { properties: Record<string, unknown>; required: string[] } };
        };
        required: string[];
      };
    };

    expect(schema.required).toEqual(['relationships']);
    expect(Object.keys(schema.properties.relationships.items.properties)).toEqual([
      'from',
      'relation',
      'to',
      'description',
      'delete',
    ]);
    expect(schema.properties.relationships.items.required).toEqual(['from', 'relation', 'to']);
  });

  it('outputs what it linked and where the read stopped', () => {
    const output = findStep(render().steps, 'output_result');

    expect(output.with).toEqual({
      items: '${{ variables.items | size | default: 0 }}',
      created: '${{ variables.created | default: 0 }}',
      updated: '${{ variables.updated | default: 0 }}',
      deleted: '${{ variables.deleted | default: 0 }}',
      rejected: '${{ variables.rejected | default: 0 }}',
      resume_from: '{{ variables.resume_from }}',
      resume_after_id: '{{ variables.resume_after_id }}',
    });
  });
});
