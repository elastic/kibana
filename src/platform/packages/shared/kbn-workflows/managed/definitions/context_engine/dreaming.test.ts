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
      { type: 'manual' },
    ]);
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
