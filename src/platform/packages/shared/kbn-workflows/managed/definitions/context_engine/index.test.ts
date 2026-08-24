/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import {
  CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW,
  CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID,
} from '.';

interface ParsedStep {
  name: string;
  type: string;
  'agent-id'?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  name?: string;
  enabled?: boolean;
  consts?: Record<string, unknown>;
  settings?: { concurrency?: { key?: string; strategy?: string } };
  triggers?: Array<{ type?: string; with?: { every?: string } }>;
  steps?: ParsedStep[];
}

const render = (
  values: Partial<{ aiIndexId: string; intervalMinutes: number; apiVersion: string }> = {}
) =>
  CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW.yamlTemplate({
    aiIndexId: 'customer_support',
    intervalMinutes: 1440,
    apiVersion: '1',
    ...values,
  });

const parsed = parse(render()) as ParsedWorkflow;

const getStep = (name: string): ParsedStep => {
  const step = parsed.steps?.find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`No '${name}' step found in the improvement loop workflow`);
  }
  return step;
};

describe('CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW', () => {
  it('uses the expected workflow id and owner', () => {
    expect(CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW.id).toBe(
      CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID
    );
    expect(CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW.pluginId).toBe('contextEngine');
  });

  it('is installed per AI index and leaves enablement to the user', () => {
    expect(CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW.management).toEqual({
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
      enablement: 'restorable',
    });
    // A re-render must not silently switch a schedule on for an index whose owner never asked.
    expect(parsed.enabled).toBe(false);
  });

  it('substitutes the AI index into the request paths, name, and concurrency key', () => {
    expect(parsed.name).toContain('customer_support');
    expect(parsed.settings?.concurrency?.key).toBe(
      'context-engine-improvement-loop-customer_support'
    );
    expect(getStep('fetch_context').with?.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/context_engine/ai_index/customer_support/feedback_context'
    );
    expect(getStep('record').with?.body).toMatchObject({ ai_index_id: 'customer_support' });
    expect(render()).not.toContain('__AI_INDEX_ID__');
  });

  it('substitutes the schedule interval and the API version of the routes it calls', () => {
    const rendered = parse(render({ intervalMinutes: 60, apiVersion: '2' })) as ParsedWorkflow;

    expect(rendered.triggers).toEqual(
      expect.arrayContaining([{ type: 'scheduled', with: { every: '60m' } }])
    );
    expect((rendered.steps ?? []).map((step) => step.with?.headers)).toEqual(
      expect.arrayContaining([expect.objectContaining({ 'elastic-api-version': '2' })])
    );
  });

  it('runs on a schedule and on demand, so "Run now" needs no separate workflow', () => {
    expect((parsed.triggers ?? []).map(({ type }) => type)).toEqual(
      expect.arrayContaining(['scheduled', 'manual'])
    );
  });

  it('resolves the agent at run time instead of baking it into the instance', () => {
    // Changing `feedback_agent_id` on the AI index has to take effect without a reinstall.
    expect(getStep('analyze')['agent-id']).toBe('{{ steps.fetch_context.output.agent_id }}');
    expect(getStep('analyze').with?.message).toBe('{{ steps.fetch_context.output.prompt }}');
  });

  it('asks the agent for structured suggestions naming the action and its target', () => {
    const schema = getStep('analyze').with?.schema as {
      properties: {
        improvements: { items: { properties: Record<string, unknown>; required: string[] } };
      };
      required: string[];
    };

    expect(schema.required).toEqual(['improvements']);
    expect(Object.keys(schema.properties.improvements.items.properties)).toEqual(
      expect.arrayContaining([
        'action',
        'title',
        'rationale',
        'target_ki_id',
        'target_workflow_id',
        'ki',
        'workflow_yaml',
      ])
    );
    expect(schema.properties.improvements.items.required).toEqual(['action', 'title', 'rationale']);
  });

  it('records whatever the agent returned, falling back to an empty list', () => {
    // Liquid has no array literal, so the empty-array fallback has to come from a const.
    expect(parsed.consts).toEqual({ no_improvements: [] });
    expect((getStep('record').with?.body as { improvements: string }).improvements).toBe(
      '${{ steps.analyze.output.structured_output.improvements | default: consts.no_improvements }}'
    );
  });
});
