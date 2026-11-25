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
  concurrency?: number;
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
const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
  createWorkflowLiquidEngine().evalValueSync(String(expression).slice(3, -2).trim(), scope);
const audience = { kibana: { privileges: [{ space: 'default' }] } };
describe('CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW', () => {
  it('is its own workflow on the dreaming schedule, named and keyed apart from dreaming', () => {
    const workflow = render();
    const dreaming = parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values));

    expect(workflow.name).toBe('Relationships: support-cases');
    expect(workflow.settings.concurrency).toEqual(dreaming.settings.concurrency);
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '90m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('writes the batch workflow it runs into the consts, and no types or instructions', () => {
    expect(render().consts).toEqual({
      ai_index_id: 'support-cases',
      memories_index: 'ai-index-idx-support-cases',
      batch_workflow_id: 'system-context-engine-batch-relationships-support-cases-0123456789abcdef',
    });
  });

  it('links batches of items that share permissions, at most 4 at once, and adds up what each wrote', () => {
    const steps = batches().steps ?? [];
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

    expect(batches().type).toBe('parallel');
    expect(batches().concurrency).toBe(4);
    expect(rendered.map((batch) => batch.length)).toEqual([25, 2, 1]);
    expect(steps).toEqual([
      expect.objectContaining({
        name: 'link_batch',
        type: 'workflow.execute',
        with: {
          'workflow-id': '{{ consts.batch_workflow_id }}',
          inputs: {
            items: '${{ foreach.item }}',
            dry_run: '${{ inputs.dry_run == true }}',
          },
        },
      }),
    ]);

    const tally = findStep(findStep(render().steps, 'link').steps ?? [], 'tally');
    const add = findStep(tally.steps ?? [], 'add_batch').with ?? {};
    const scope = {
      variables: { created: 1, updated: 0, deleted: 0, rejected: 2, would_write: [] },
      foreach: {
        item: { output: { created: 2, updated: 1, deleted: 1, rejected: 1, would_write: [] } },
      },
    };
    expect(tally.foreach).toBe('{{ steps.batches.output.results | json }}');
    expect(
      Object.fromEntries(Object.entries(add).map(([key, value]) => [key, evaluate(value, scope)]))
    ).toEqual({ created: 3, updated: 1, deleted: 1, rejected: 3, would_write: [] });
  });

  it('reads only what a batch needs to be told from its items, so the read output stays small', () => {
    const read = findStep(render().steps, 'read_items').with;
    const { collapse } = read as { collapse: { inner_hits: { _source: { includes: string[] } } } };

    expect(collapse.inner_hits._source.includes).toEqual([
      'id',
      'type',
      'updated_at',
      'permissions',
      'governance.lifecycle.status',
    ]);
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
        should: [
          { prefix: { type: { value: 'fact.' } } },
          { prefix: { type: { value: 'entity.' } } },
        ],
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
