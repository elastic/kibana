/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineTraceDreamingBatchWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW, CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

interface Step {
  name: string;
  type: string;
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

const values: ContextEngineTraceDreamingBatchWorkflowTemplateValues = {
  aiIndexId: 'support-cases',
  instanceKey: 'support-cases-0123456789abcdef',
  memoriesIndex: 'ai-index-idx-support-cases',
  intervalMinutes: 90,
  connectorId: 'my-connector',
  instructions: 'Remember what customers "prefer".\nSkip {{ small talk }}.',
  factTypes: [{ type: 'preference', description: 'Something a customer likes.' }],
  entityTypes: [{ type: 'customer', attributes: ['tier'] }, { type: 'city' }],
  relationshipTypes: [{ type: 'lives_in', description: 'A customer lives in a city.' }],
};

const render = () => parse(CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW.yamlTemplate(values));

describe('CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW', () => {
  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('writes the dreaming config into the consts exactly as given, and has no schedule of its own', () => {
    const workflow = render();

    expect(workflow.name).toBe('Trace dreaming batch: support-cases');
    expect(workflow.consts).toEqual({
      ai_index_id: 'support-cases',
      memories_index: 'ai-index-idx-support-cases',
      connector_id: 'my-connector',
      instructions: values.instructions,
      fact_types: values.factTypes,
      entity_types: values.entityTypes,
      relationship_types: values.relationshipTypes,
    });
    expect(workflow.settings.concurrency).toBeUndefined();
    expect(workflow.triggers).toEqual([
      {
        type: 'manual',
        inputs: expect.objectContaining({
          required: ['memories'],
          properties: expect.objectContaining({
            memories: expect.objectContaining({ type: 'array' }),
            dry_run: expect.objectContaining({ type: 'boolean' }),
          }),
        }),
      },
    ]);
  });

  it('extracts from the rounds it is given, applies the changes citing them, and links what it wrote', () => {
    const { steps } = render();

    expect(steps.map(({ name }: Step) => name)).toEqual([
      'read_existing',
      'extract',
      'apply_changes',
      'relationships',
      'batch_output',
    ]);
    expect(findStep(steps, 'apply_changes').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      memories: '${{ inputs.memories }}',
      changes: '${{ steps.extract.output.content }}',
      dry_run: '${{ inputs.dry_run == true }}',
    });
  });

  it('links what it writes with the same relationship steps as dreaming, on the rounds it is given', () => {
    const dreamingBatches = findStep(
      findStep(parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values)).steps, 'dream').steps ??
        [],
      'batches'
    );
    const dreamingRelationships = findStep(dreamingBatches.steps ?? [], 'relationships');
    const expected = JSON.parse(
      JSON.stringify({
        ...dreamingRelationships,
        steps: (dreamingRelationships.steps ?? []).filter(
          ({ name }) => name !== 'tally_relationships'
        ),
      }).replace(/foreach\.item/g, 'inputs.memories')
    );

    expect(findStep(render().steps, 'relationships')).toEqual(expected);
  });

  it('outputs what it wrote, with nothing for relationships when it linked none', () => {
    const output = findStep(render().steps, 'batch_output');
    const engine = createWorkflowLiquidEngine();
    const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
      engine.evalValueSync(String(expression).slice(3, -2).trim(), scope);
    const written = Object.fromEntries(
      Object.entries(output.with ?? {}).map(([key, expression]) => [
        key,
        evaluate(expression, {
          steps: {
            apply_changes: {
              output: { created: 3, updated: 1, deleted: 0, rejected: [{}], would_write: [] },
            },
          },
        }),
      ])
    );

    expect(output.type).toBe('workflow.output');
    expect(written).toEqual({
      created: 3,
      updated: 1,
      deleted: 0,
      rejected: 1,
      relationships_created: 0,
      relationships_updated: 0,
      relationships_deleted: 0,
      relationships_rejected: 0,
      would_write: [],
    });
  });

  it("shows the model the batch's rounds, a conversation at a time, and the configured types", () => {
    const prompt = String(findStep(render().steps, 'extract').with?.prompt);
    const round = {
      id: 'trace:51fff8a2',
      type: 'trace.round',
      title: 'Agent conversation with Elastic AI Agent, round ending 2026-11-11T13:12:03.357Z',
      content: 'User: I always want vegetarian meals.\nAssistant: Noted.',
      attributes: { 'trace.conversation_id': 'conv-1' },
      permissions: { kibana: { privileges: [{ space: 'default' }] } },
    };

    const rendered = createWorkflowLiquidEngine().parseAndRenderSync(prompt, {
      consts: render().consts,
      inputs: { memories: [round] },
      steps: { read_existing: { output: { hits: { hits: [] } } } },
    });

    expect(rendered).toContain(
      'You extract long-term memory from the conversations users had with agents'
    );
    expect(rendered).toContain('whole conversations at a time');
    expect(rendered).toContain('attributes["trace.conversation_id"]');
    expect(rendered).toContain('A tool result is evidence');
    expect(rendered).toContain(JSON.stringify(round));
    expect(rendered).toContain('- preference: Something a customer likes.');
    expect(rendered).toContain('- customer (attributes: tier)');
    expect(rendered).toContain(values.instructions);
  });
});
