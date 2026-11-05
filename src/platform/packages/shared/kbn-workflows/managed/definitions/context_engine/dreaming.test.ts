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
    const [status, run] = render().steps;

    expect(status).toEqual(
      expect.objectContaining({ name: 'status', type: 'context-engine.getDreamingStatus' })
    );
    expect(run).toEqual(
      expect.objectContaining({
        type: 'if',
        condition: '${{ steps.status.output.dream == true }}',
      })
    );
    expect(run.steps.map(({ name }: { name: string }) => name)).toEqual([
      'last_run',
      'read_memories',
      'dream',
    ]);
  });

  it('keeps tombstones in the memory query, so collapse returns each memory latest revision', () => {
    const readMemories = render().steps[1].steps[1];

    expect(readMemories.with.collapse).toEqual({ field: 'id' });
    expect(readMemories.with.query.bool).not.toHaveProperty('must_not');
    expect(readMemories.with._source).toContain('governance.lifecycle.status');
  });
});
