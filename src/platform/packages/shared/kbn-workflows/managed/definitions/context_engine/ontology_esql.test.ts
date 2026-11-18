/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineOntologyWorkflowTemplateValues } from '.';
import {
  CONTEXT_ENGINE_DREAMING_WORKFLOW,
  CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW,
  CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

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

const values: ContextEngineOntologyWorkflowTemplateValues = {
  aiIndexId: 'shop',
  instanceKey: 'shop-0123456789abcdef',
  memoriesIndex: 'ai-index-idx-shop',
  intervalMinutes: 120,
  connectorId: '',
  instructions: 'Orders are "placed" in EUR.\nSkip {{ test }} indices.',
  factTypes: [],
  entityTypes: [],
  relationshipTypes: [],
  sourceId: '0123456789abcdef',
  sourceValue: 'FROM orders',
};

const customer = { type: 'customer', description: 'Someone who buys.', attributes: ['tier'] };

const render = (overrides: Partial<ContextEngineOntologyWorkflowTemplateValues> = {}) =>
  parse(CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW.yamlTemplate({ ...values, ...overrides }));
const datasetSteps = (workflow = render()) =>
  findStep(findStep(workflow.steps, 'describe').steps ?? [], 'datasets').steps ?? [];
const engine = () => createWorkflowLiquidEngine();
const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
  engine().evalValueSync(String(expression).slice(3, -2).trim(), scope);

const orders = {
  name: 'orders',
  kind: 'index',
  id: 'ontology-dataset--orders-1234abcd',
  fingerprint: 'fp',
  reason: 'new',
  time_field: '@timestamp',
  row_count: 42,
  fields: [
    { name: 'customer_id', type: 'keyword', distinct: 40 },
    { name: 'status', type: 'keyword', distinct: 2, top_values: [{ value: 'paid', count: 30 }] },
  ],
  omitted_fields: 3,
  errors: [],
};

const catalog = [
  {
    name: 'orders',
    kind: 'index',
    source_ids: ['s1'],
    fields: [{ name: 'customer_id', type: 'keyword', searchable: true, aggregatable: true }],
  },
  {
    name: 'returns',
    kind: 'index',
    source_ids: ['s1'],
    fields: [
      { name: 'order_id', type: 'keyword', searchable: true, aggregatable: true },
      { name: 'notes', type: 'text', searchable: true, aggregatable: false },
    ],
  },
];
const others = [
  {
    name: 'customers',
    kind: 'index',
    source_ids: ['s2'],
    fields: [{ name: 'id', type: 'keyword', searchable: true, aggregatable: true }],
  },
];
const existing = [
  {
    id: 'ontology-term--customer',
    type: 'ontology.term',
    title: 'Customer',
    fields: ['customers:id'],
    synonyms: ['client'],
  },
];
const history = {
  output: {
    queries: [
      { dataset: 'orders', query: 'FROM orders | LIMIT 5', round_id: 'trace:t1' },
      { dataset: 'returns', query: 'FROM returns | LIMIT 5', round_id: 'trace:t2' },
    ],
  },
};

const describePrompt = (workflow = render()) =>
  engine().parseAndRenderSync(
    String(findStep(datasetSteps(workflow), 'describe_dataset').with?.prompt),
    {
      consts: workflow.consts,
      foreach: { item: { ...orders, current: { description: 'Old description.' } } },
      steps: { catalog: { output: { catalog, others, existing, datasets: [orders] } }, history },
    }
  );

describe('CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW', () => {
  it('is one workflow per source, queued with the other sources of its AI index', () => {
    const workflow = render();
    const connector = parse(
      CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW.yamlTemplate({ ...values, sourceId: 'other' })
    );
    const dreaming = parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values));

    expect(workflow.name).toBe('Ontology discovery (ES|QL): shop 0123456789abcdef');
    expect(workflow.settings.concurrency).toEqual({
      key: 'context-engine-ontology-shop-0123456789abcdef',
      strategy: 'queue',
      max: 1,
    });
    expect(connector.settings.concurrency.key).toBe(workflow.settings.concurrency.key);
    expect(workflow.settings.concurrency.key).not.toBe(dreaming.settings.concurrency.key);
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '120m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
    expect(workflow.consts).toEqual({
      ai_index_id: 'shop',
      source_id: '0123456789abcdef',
      connector_id: '',
      instructions: values.instructions,
      entity_types: [],
    });
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('checks its source is still discovered before cataloging it or calling a model', () => {
    const { steps } = render();

    expect(steps.map(({ name }: Step) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'catalog',
      'history',
      'totals',
      'describe',
      'check_joins',
      'merge',
      'apply_terms',
      'dry_run_result',
      'output_result',
    ]);
    expect(steps[0]).toEqual(
      expect.objectContaining({
        type: 'context-engine.getDreamingStatus',
        with: {
          ai_index_id: '{{ consts.ai_index_id }}',
          source: 'ontology',
          source_id: '{{ consts.source_id }}',
        },
      })
    );
    expect(findStep(steps, 'catalog').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      source_id: '{{ consts.source_id }}',
    });
  });

  it('describes a dataset with its profile, history, terms and the datasets it could join', () => {
    const prompt = describePrompt();

    expect(prompt).toContain(values.instructions);
    expect(prompt).toContain('DATASET: orders (index)');
    expect(prompt).toContain(
      '{"name":"status","type":"keyword","distinct":2,"top_values":[{"value":"paid","count":30}]}'
    );
    expect(prompt).toContain('(3 more fields not shown)');
    expect(prompt).toContain('{"description":"Old description."}');
    expect(prompt).toContain('{"query":"FROM orders | LIMIT 5","round_id":"trace:t1"}');
    expect(prompt).not.toContain('FROM returns | LIMIT 5');
    expect(prompt).toContain('"returns": order_id');
    expect(prompt).not.toContain('notes');
    expect(prompt).toContain('"customers": id');
    expect(prompt).toContain('Use the exact name of an EXISTING TERM');
  });

  it('maps fields only onto the configured entity types once there are any, proposing the rest', () => {
    const prompt = describePrompt(render({ entityTypes: [customer] }));

    expect(prompt).toContain('- customer: Someone who buys. (attributes: tier)');
    expect(prompt).toContain('- terms: the ENTITY TYPES this dataset');
    expect(prompt).toContain('- proposed_entity_types: business concepts');
    expect(prompt).not.toContain('Use the exact name of an EXISTING TERM');
  });

  it('writes each description as one dataset change, collecting terms, proposals and joins', () => {
    const apply = findStep(datasetSteps(), 'apply_dataset').with ?? {};
    const content = {
      description: 'One row per order.',
      content: 'Orders.',
      access_patterns: [],
      source_round_ids: ['trace:t1'],
      terms: [{ name: 'Customer', fields: ['orders:customer_id'] }],
      proposed_entity_types: [{ name: 'Invoice' }],
      join_candidates: [
        {
          from_dataset: 'orders',
          from_field: 'customer_id',
          to_dataset: 'customers',
          to_field: 'id',
        },
      ],
    };
    const [dataset] = (apply.changes as { datasets: Array<Record<string, unknown>> }).datasets;
    const scope = {
      foreach: { item: orders },
      steps: { describe_dataset: { output: { content } } },
    };

    expect(apply.source_id).toBe('{{ consts.source_id }}');
    expect(engine().parseAndRenderSync(String(dataset.name), scope)).toBe('orders');
    expect(evaluate(dataset.source_round_ids, scope)).toEqual(['trace:t1']);

    const tally = findStep(datasetSteps(), 'tally_dataset').with ?? {};
    const tallyScope = {
      variables: { proposed_terms: [], proposed_entity_types: [], join_candidates: [] },
      steps: { describe_dataset: { output: { content } } },
    };
    expect(evaluate(tally.proposed_terms, tallyScope)).toEqual(content.terms);
    expect(evaluate(tally.proposed_entity_types, tallyScope)).toEqual([{ name: 'Invoice' }]);
    expect(evaluate(tally.join_candidates, tallyScope)).toEqual(content.join_candidates);
  });

  it("checks joins against this source's datasets and the ones other sources described", () => {
    const joins = findStep(findStep(render().steps, 'check_joins').steps ?? [], 'joins');

    expect(
      evaluate(joins.with?.catalog, { steps: { catalog: { output: { catalog, others } } } })
    ).toEqual([...catalog, ...others]);
  });

  it('applies terms, joins and stale datasets for its source, and reports the proposals', () => {
    const { steps } = render();
    const apply = findStep(steps, 'apply_terms').with ?? {};

    expect(apply).toEqual(
      expect.objectContaining({
        source_id: '{{ consts.source_id }}',
        changes: '${{ steps.merge_terms.output.content }}',
        joins: '${{ steps.joins.output.verified }}',
        stale: '${{ steps.catalog.output.stale }}',
      })
    );
    expect(findStep(steps, 'output_result').with?.proposed_entity_types).toBe(
      '${{ variables.proposed_entity_types }}'
    );
  });

  it("merges proposed terms with the existing ones, owning only this source's fields", () => {
    const workflow = render({ entityTypes: [customer] });
    const merge = findStep(findStep(workflow.steps, 'merge').steps ?? [], 'merge_terms');
    const prompt = engine().parseAndRenderSync(String(merge.with?.prompt), {
      consts: workflow.consts,
      variables: { proposed_terms: [{ name: 'customer', fields: ['orders:customer_id'] }] },
      steps: { catalog: { output: { catalog, existing } } },
    });

    expect(prompt).toContain('{"name":"customer","fields":["orders:customer_id"]}');
    expect(prompt).toContain(
      '{"title":"Customer","synonyms":["client"],"fields":["customers:id"]}'
    );
    expect(prompt).toContain('Every term is one of the ENTITY TYPES');
    expect(prompt).toContain("They replace this source's fields of the term");
    expect(prompt).toContain('DATASETS:\n"orders"\n"returns"');
  });
});
