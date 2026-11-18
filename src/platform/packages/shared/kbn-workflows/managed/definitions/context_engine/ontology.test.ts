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
import { CONTEXT_ENGINE_DREAMING_WORKFLOW, CONTEXT_ENGINE_ONTOLOGY_WORKFLOW } from '.';
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
};

const render = () => parse(CONTEXT_ENGINE_ONTOLOGY_WORKFLOW.yamlTemplate(values));
const datasetSteps = () =>
  findStep(findStep(render().steps, 'describe').steps ?? [], 'datasets').steps ?? [];
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
  earliest: '2026-01-01T00:00:00.000Z',
  latest: '2026-11-01T00:00:00.000Z',
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
    name: 'customers',
    kind: 'index',
    source_ids: ['s1'],
    fields: [
      { name: 'id', type: 'keyword', searchable: true, aggregatable: true },
      { name: 'notes', type: 'text', searchable: true, aggregatable: false },
      { name: 'age', type: 'integer', searchable: true, aggregatable: true },
    ],
  },
];

const existing = [
  {
    id: 'ontology-term--customer',
    type: 'ontology.term',
    title: 'Customer',
    status: 'certified',
    fields: ['customers:id'],
    synonyms: ['client'],
  },
  {
    id: 'ontology-dataset--customers',
    type: 'ontology.dataset',
    title: 'customers',
    status: 'draft',
  },
];

const history = {
  output: {
    queries: [
      { dataset: 'orders', query: 'FROM orders | LIMIT 5', round_id: 'trace:t1' },
      { dataset: 'customers', query: 'FROM customers | LIMIT 5', round_id: 'trace:t2' },
    ],
  },
};

describe('CONTEXT_ENGINE_ONTOLOGY_WORKFLOW', () => {
  it('is its own workflow on the dreaming schedule, named and keyed apart from dreaming', () => {
    const workflow = render();
    const dreaming = parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values));

    expect(workflow.name).toBe('Ontology discovery: shop');
    expect(workflow.settings.concurrency.key).toBe('context-engine-ontology-shop-0123456789abcdef');
    expect(workflow.settings.concurrency.key).not.toBe(dreaming.settings.concurrency.key);
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '120m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
    expect(workflow.consts).toEqual({
      ai_index_id: 'shop',
      connector_id: '',
      instructions: values.instructions,
    });
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('checks ontology discovery is on before cataloging or calling a model', () => {
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
        with: { ai_index_id: '{{ consts.ai_index_id }}', source: 'ontology' },
      })
    );
    expect(findStep(steps, 'catalog').type).toBe('context-engine.catalogOntologySources');
    expect(findStep(steps, 'history').type).toBe('context-engine.readOntologyQueryHistory');
  });

  it('reads the query history of the datasets it describes, since the last run', () => {
    const history_ = findStep(render().steps, 'history').with ?? {};

    expect(
      evaluate(history_.datasets, { steps: { catalog: { output: { datasets: [orders] } } } })
    ).toEqual(['orders']);
    expect(history_.since).toBe('{{ steps.last_run.output.since }}');
  });

  it('describes each profiled dataset with its profile, history, terms and joinable datasets', () => {
    const describe = findStep(datasetSteps(), 'describe_dataset');
    const prompt = engine().parseAndRenderSync(String(describe.with?.prompt), {
      consts: render().consts,
      foreach: { item: { ...orders, current: { description: 'Old description.' } } },
      steps: { catalog: { output: { catalog, existing, datasets: [orders] } }, history },
    });

    expect(prompt).toContain(values.instructions);
    expect(prompt).toContain('DATASET: orders (index)');
    expect(prompt).toContain('Time field: @timestamp');
    expect(prompt).toContain('Rows: 42');
    expect(prompt).toContain(
      '{"name":"status","type":"keyword","distinct":2,"top_values":[{"value":"paid","count":30}]}'
    );
    expect(prompt).toContain('(3 more fields not shown)');
    expect(prompt).toContain('{"description":"Old description."}');
    expect(prompt).toContain('{"query":"FROM orders | LIMIT 5","round_id":"trace:t1"}');
    expect(prompt).not.toContain('FROM customers | LIMIT 5');
    expect(prompt).toContain(
      '{"title":"Customer","synonyms":["client"],"fields":["customers:id"]}'
    );
    expect(prompt).toContain('"customers": id age');
    expect(prompt).not.toContain('notes');
  });

  it('writes each description as one dataset change, and collects its terms and join candidates', () => {
    const apply = findStep(datasetSteps(), 'apply_dataset').with ?? {};
    const content = {
      description: 'One row per order.',
      content: 'Orders.',
      access_patterns: [],
      source_round_ids: ['trace:t1'],
      terms: [{ name: 'Customer', fields: ['orders:customer_id'] }],
      join_candidates: [
        {
          from_dataset: 'orders',
          from_field: 'customer_id',
          to_dataset: 'customers',
          to_field: 'id',
        },
      ],
    };
    const scope = {
      foreach: { item: orders },
      steps: { describe_dataset: { output: { content } } },
    };
    const [dataset] = (apply.changes as { datasets: Array<Record<string, unknown>> }).datasets;

    expect(apply.catalog).toBe('${{ steps.catalog.output.catalog }}');
    expect(engine().parseAndRenderSync(String(dataset.name), scope)).toBe('orders');
    expect(evaluate(dataset.description, scope)).toBe('One row per order.');
    expect(evaluate(dataset.source_round_ids, scope)).toEqual(['trace:t1']);

    const tally = findStep(datasetSteps(), 'tally_dataset').with ?? {};
    const tallyScope = {
      variables: { proposed_terms: [{ name: 'Order' }], join_candidates: [] },
      steps: { describe_dataset: { output: { content } } },
    };
    expect(evaluate(tally.proposed_terms, tallyScope)).toEqual([
      { name: 'Order' },
      ...content.terms,
    ]);
    expect(evaluate(tally.join_candidates, tallyScope)).toEqual(content.join_candidates);
  });

  it('verifies joins and merges terms only when there are any, then applies terms, joins and stale datasets', () => {
    const { steps } = render();
    const joins = findStep(steps, 'check_joins');
    const merge = findStep(steps, 'merge');
    const apply = findStep(steps, 'apply_terms').with ?? {};

    expect(evaluate(joins.condition, { variables: { join_candidates: [] } })).toBe(false);
    expect(evaluate(merge.condition, { variables: { proposed_terms: [{ name: 'Order' }] } })).toBe(
      true
    );
    expect(findStep(joins.steps ?? [], 'joins').type).toBe('context-engine.verifyOntologyJoins');
    expect(apply).toEqual(
      expect.objectContaining({
        changes: '${{ steps.merge_terms.output.content }}',
        joins: '${{ steps.joins.output.verified }}',
        stale: '${{ steps.catalog.output.stale }}',
      })
    );
  });

  it('merges proposed terms with the existing ones, marking certified terms', () => {
    const merge = findStep(findStep(render().steps, 'merge').steps ?? [], 'merge_terms');
    const prompt = engine().parseAndRenderSync(String(merge.with?.prompt), {
      consts: render().consts,
      variables: { proposed_terms: [{ name: 'Customer', fields: ['orders:customer_id'] }] },
      steps: { catalog: { output: { catalog, existing } } },
    });

    expect(prompt).toContain('{"name":"Customer","fields":["orders:customer_id"]}');
    expect(prompt).toContain(
      '{"title":"Customer","status":"certified","synonyms":["client"],"fields":["customers:id"]}'
    );
    expect(prompt).toContain('DATASETS:\n"orders"\n"customers"');
  });
});
