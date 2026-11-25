/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineRelationshipsBatchWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_RELATIONSHIPS_BATCH_WORKFLOW } from '.';
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

const values: ContextEngineRelationshipsBatchWorkflowTemplateValues = {
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

const render = () => parse(CONTEXT_ENGINE_RELATIONSHIPS_BATCH_WORKFLOW.yamlTemplate(values));
const batchSteps = (): Step[] => render().steps;
const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
  createWorkflowLiquidEngine().evalValueSync(String(expression).slice(3, -2).trim(), scope);
const hits = (sources: Array<Record<string, unknown>>) => ({
  output: { hits: { hits: sources.map((source) => ({ _source: source })) } },
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
      variables: { items },
      steps: {
        read_entities: hits(entities),
        read_facts: hits(facts),
        read_relationships: hits(relationships),
      },
    }
  );
const section = (rendered: string, start: string, end: string) =>
  rendered.slice(rendered.indexOf(start), rendered.indexOf(end));

describe('CONTEXT_ENGINE_RELATIONSHIPS_BATCH_WORKFLOW', () => {
  it('is a workflow of its own that only a parent run starts, named for its AI index', () => {
    const workflow = render();

    expect(workflow.name).toBe('Relationships batch: support-cases');
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      expect.objectContaining({
        type: 'manual',
        inputs: expect.objectContaining({ required: ['items'] }),
      }),
    ]);
    expect(workflow.settings).not.toHaveProperty('concurrency');
    expect(() => convertToWorkflowGraph(workflow)).not.toThrow();
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

  it('loads the content of its items by id, which the read of the parent leaves out', () => {
    const steps = batchSteps();
    const read = findStep(steps, 'read_items').with;

    expect(steps.slice(0, 2).map(({ name }) => name)).toEqual(['read_items', 'items']);
    expect(read?._source).toEqual(expect.arrayContaining(['title', 'description', 'content']));
    expect(read?.size).toBe(100);
    expect(read?.collapse).toEqual({ field: 'id' });
    expect(read?.sort).toEqual([{ updated_at: 'desc' }]);
    expect(
      evaluate((read?.query?.bool?.filter as Array<{ terms: { id: string } }>)[0].terms.id, {
        inputs: { items: [bob, fact] },
      })
    ).toEqual([bob.id, fact.id]);
    expect(
      evaluate(findStep(steps, 'items').with?.items, {
        steps: { read_items: hits([bob, fact]) },
      })
    ).toEqual([bob, fact]);
  });

  it('runs its steps in order and totals what it wrote', () => {
    const steps = batchSteps();

    expect(steps.map(({ name }) => name)).toEqual([
      'read_items',
      'items',
      'read_entities',
      'read_relationships',
      'mentions',
      'match_facts',
      'read_facts',
      'relate',
      'apply_relationships',
      'batch_output',
    ]);
    expect(findStep(steps, 'apply_relationships').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      items: '${{ inputs.items | map: "id" }}',
      changes: '${{ steps.relate.output.content }}',
      dry_run: '${{ inputs.dry_run == true }}',
    });
    expect(
      evaluate(findStep(steps, 'apply_relationships').with?.items, {
        inputs: { items: [bob, fact] },
      })
    ).toEqual([bob.id, fact.id]);
    expect(findStep(steps, 'batch_output').with).toEqual(
      expect.objectContaining({
        created: '${{ steps.apply_relationships.output.created | default: 0 }}',
        rejected: '${{ steps.apply_relationships.output.rejected | size | default: 0 }}',
      })
    );
  });

  it('reads the entities most like its items first, not the newest ones', () => {
    const read = findStep(batchSteps(), 'read_entities').with;
    const should = read?.query?.bool?.should as Array<{ match: { title: { query: string } } }>;
    const engine = createWorkflowLiquidEngine();
    const long = 'word '.repeat(2000);

    expect(read?.size).toBe(300);
    expect(read?.sort).toEqual([{ _score: 'desc' }, { updated_at: 'desc' }]);
    expect(read?.query?.bool?.filter).toEqual(
      expect.arrayContaining([{ prefix: { type: { value: 'entity.' } } }])
    );
    const query = engine.parseAndRenderSync(should[0].match.title.query, {
      variables: { items: [{ title: 'Bob', content: 'Bob lives in Lyon.' }] },
    });
    expect(query).toContain('Bob');
    expect(query).toContain('Lyon');
    expect(
      engine.parseAndRenderSync(should[0].match.title.query, {
        variables: { items: [{ title: 'Bob', content: long }] },
      }).length
    ).toBeLessThanOrEqual(1000 + 1 + 3000);
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
    expect(evaluate(uris.terms?.['references.uri'], { variables: { items: [bob, lyon] } })).toEqual(
      ['ki://entity-customer--bob', 'ki://entity-city--lyon']
    );
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
      JSON.parse(engine.parseAndRenderSync(clauses, { variables: { items } }));

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

    const bool = findStep(batchSteps(), 'match_facts').with?.query?.bool ?? {};
    expect(
      evaluate(bool.should, {
        variables: { mention_clauses: '[{"match_phrase":{"title":"Bob"}}]' },
      })
    ).toEqual([{ match_phrase: { title: 'Bob' } }]);
    expect(bool.minimum_should_match).toBe(1);
  });

  it('matches up to 100 facts, best match first, by id alone', () => {
    const match = findStep(batchSteps(), 'match_facts').with;

    expect(match?.size).toBe(100);
    expect(match?.sort).toBeUndefined();
    expect(match?._source).toBe(false);
    expect(match?.collapse).toEqual({ field: 'id' });
    expect(match?.query?.bool?.filter).toEqual(
      expect.arrayContaining([{ prefix: { type: { value: 'fact.' } } }])
    );
    expect(
      evaluate((match?.query?.bool?.must_not as Array<{ terms: { id: string } }>)[0].terms.id, {
        variables: { items: [bob, fact] },
      })
    ).toEqual([bob.id, fact.id]);
  });

  it('reads the latest revision of each matched fact, whether or not it still matches', () => {
    const read = findStep(batchSteps(), 'read_facts').with;
    const [ids] = (read?.query?.bool?.filter ?? []) as Array<{ terms: { id: string } }>;
    const matched = (factIds: string[]) => ({
      steps: {
        match_facts: {
          output: { hits: { hits: factIds.map((id) => ({ fields: { id: [id] } })) } },
        },
      },
    });

    expect(read?.size).toBe(100);
    expect(read?.sort).toEqual([{ updated_at: 'desc' }]);
    expect(read?.collapse).toEqual({ field: 'id' });
    expect(read?.query?.bool?.should).toBeUndefined();
    expect(evaluate(ids.terms.id, matched([olderFact.id, 'fact-2']))).toEqual([
      olderFact.id,
      'fact-2',
    ]);
    expect(evaluate(ids.terms.id, matched([]))).toEqual([]);
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
});
