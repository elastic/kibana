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
import { CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

interface Step {
  name: string;
  type: string;
  condition?: string;
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
  intervalMinutes: 60,
  connectorId: 'my-llm',
  instructions: 'The drive holds "contracts".',
  factTypes: [],
  entityTypes: [],
  relationshipTypes: [],
  sourceId: 'fedcba9876543210',
  sourceValue: 'drive-1',
};

const render = (overrides: Partial<ContextEngineOntologyWorkflowTemplateValues> = {}) =>
  parse(CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW.yamlTemplate({ ...values, ...overrides }));
const engine = () => createWorkflowLiquidEngine();
const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
  engine().evalValueSync(String(expression).slice(3, -2).trim(), scope);

const catalogOutput = {
  describe: true,
  datasets: [
    {
      name: 'connector:drive-1',
      kind: 'connector',
      id: 'ontology-dataset--connector-drive-1-0000',
      title: 'Team drive',
      fingerprint: 'fp',
      reason: 'new',
      fields: [],
      omitted_fields: 0,
      errors: [],
    },
  ],
  connector: {
    id: 'drive-1',
    name: 'Team drive',
    type: '.google_drive',
    description: 'Google Drive files.',
    skill: 'Search before you download.',
  },
  tools: [{ name: 'searchFiles', description: 'Search files', parameters: '{"type":"object"}' }],
  others: [
    {
      name: 'customers',
      kind: 'index',
      source_ids: ['s2'],
      fields: [{ name: 'email', type: 'keyword', searchable: true, aggregatable: true }],
    },
  ],
  existing: [],
};
const sampleOutput = {
  samples: [
    { sub_action: 'searchFiles', params: '{}', ok: true, sample: '{"files":[{"id":"f1"}]}' },
  ],
  catalog: [
    {
      name: 'connector:drive-1',
      kind: 'connector',
      source_ids: ['fedcba9876543210'],
      fields: [
        {
          name: 'searchFiles.files.id',
          type: 'keyword',
          searchable: false,
          aggregatable: false,
          sample_values: ['f1'],
        },
      ],
    },
  ],
  rejected: [],
};
const history = {
  output: {
    queries: [
      {
        dataset: 'connector:drive-1',
        query: '{"subAction":"searchFiles","params":{"query":"budget"}}',
        round_id: 'trace:t1',
      },
    ],
  },
};

describe('CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW', () => {
  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('stops before calling a model or the connector when the connector is unchanged', () => {
    const { steps } = render();

    expect(steps.map(({ name }: Step) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'catalog',
      'unchanged',
      'history',
      'plan_samples',
      'sample',
      'describe_connector',
      'apply_dataset',
      'check_joins',
      'merge',
      'apply_terms',
      'dry_run_result',
      'output_result',
    ]);
    expect(findStep(steps, 'catalog').type).toBe('context-engine.catalogConnectorSource');
    const unchanged = findStep(steps, 'unchanged');
    expect(
      evaluate(unchanged.condition, { steps: { catalog: { output: { describe: false } } } })
    ).toBe(true);
    expect(unchanged.steps).toEqual([expect.objectContaining({ type: 'workflow.output' })]);
  });

  it('plans sample calls from the read sub-actions, the skill and the calls agents made', () => {
    const workflow = render();
    const prompt = engine().parseAndRenderSync(
      String(findStep(workflow.steps, 'plan_samples').with?.prompt),
      { consts: workflow.consts, steps: { catalog: { output: catalogOutput }, history } }
    );

    expect(prompt).toContain('CONNECTOR: Team drive (.google_drive): Google Drive files.');
    expect(prompt).toContain('HOW TO USE IT:\nSearch before you download.');
    expect(prompt).toContain(
      '{"name":"searchFiles","description":"Search files","parameters":"{\\"type\\":\\"object\\"}"}'
    );
    expect(prompt).toContain('{"subAction":"searchFiles","params":{"query":"budget"}}');
    expect(findStep(workflow.steps, 'sample').with?.calls).toBe(
      '${{ steps.plan_samples.output.content.calls }}'
    );
  });

  it('describes the connector from its samples and fields, under its dataset name', () => {
    const workflow = render({ entityTypes: [{ type: 'person', attributes: ['email'] }] });
    const prompt = engine().parseAndRenderSync(
      String(findStep(workflow.steps, 'describe_connector').with?.prompt),
      {
        consts: workflow.consts,
        steps: { catalog: { output: catalogOutput }, sample: { output: sampleOutput }, history },
      }
    );

    expect(prompt).toContain('dataset connector:drive-1');
    expect(prompt).toContain('"sample":"{\\"files\\":[{\\"id\\":\\"f1\\"}]}"');
    expect(prompt).toContain(
      '{"name":"searchFiles.files.id","type":"keyword","sample_values":["f1"]}'
    );
    expect(prompt).toContain('as connector:drive-1:<field> with one of the FIELDS');
    expect(prompt).toContain('- person (attributes: email)');
    expect(prompt).toContain('"customers": email');
  });

  it("applies the connector's dataset with its profile and checks joins against other sources", () => {
    const { steps } = render();
    const apply = findStep(steps, 'apply_dataset').with ?? {};
    const scope = {
      steps: {
        catalog: { output: catalogOutput },
        sample: { output: sampleOutput },
        describe_connector: { output: { content: { connector_access_patterns: [] } } },
      },
    };
    const [dataset] = (apply.changes as { datasets: Array<Record<string, unknown>> }).datasets;

    expect(evaluate(apply.catalog, scope)).toEqual(sampleOutput.catalog);
    expect(evaluate(apply.profiles, scope)).toEqual(catalogOutput.datasets);
    expect(engine().parseAndRenderSync(String(dataset.name), scope)).toBe('connector:drive-1');
    expect(evaluate(dataset.connector_access_patterns, scope)).toEqual([]);

    const joins = findStep(findStep(steps, 'check_joins').steps ?? [], 'joins');
    expect(evaluate(joins.with?.catalog, scope)).toEqual([
      ...sampleOutput.catalog,
      ...catalogOutput.others,
    ]);
    expect(findStep(steps, 'apply_terms').with?.source_id).toBe('{{ consts.source_id }}');
  });
});
