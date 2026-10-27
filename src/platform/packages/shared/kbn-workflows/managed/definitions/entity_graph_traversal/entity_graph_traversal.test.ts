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
  SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW,
  SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { buildFieldsZodValidator } from '../../../spec/lib/build_fields_zod_validator';
import { getInputsFromDefinition } from '../../../spec/lib/field_conversion';
import { WorkflowSchema } from '../../../spec/schema';

type Step = Record<string, unknown>;

const findStepByName = (steps: unknown[], name: string): Step | undefined => {
  for (const step of steps) {
    const s = step as Step;
    if (s.name === name) return s;
    const nested = s.steps;
    if (Array.isArray(nested)) {
      const found = findStepByName(nested, name);
      if (found) return found;
    }
  }
  return undefined;
};

/** Mirrors `WorkflowTemplatingEngine.evaluateExpression` for a `${{ ... }}` string. */
const evaluate = (
  engine: ReturnType<typeof createWorkflowLiquidEngine>,
  template: string,
  context: Record<string, unknown>
): unknown => {
  const open = template.indexOf('{{');
  const close = template.lastIndexOf('}}');
  return engine.evalValueSync(template.substring(open + 2, close).trim(), context);
};

describe('SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW', () => {
  const parsed = parse(SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW.yaml);

  it('is a valid workflow definition', () => {
    const result = WorkflowSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    expect(SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW.id).toBe(
      SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID
    );
    expect(SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW.pluginId).toBe('securitySolution');
  });

  it('is manual only: no scheduled or alert triggers', () => {
    expect(parsed.triggers.map((t: { type: string }) => t.type)).toEqual(['manual']);
  });

  it('requires a scenario id and a seed id, and bounds every limit override', () => {
    const validator = buildFieldsZodValidator(getInputsFromDefinition(parsed));
    expect(validator.safeParse({}).success).toBe(false);
    expect(
      validator.safeParse({
        scenario_id: 'okta-user-to-aws-resources',
        seed_id: 'john.doe@acme.com',
      }).success
    ).toBe(true);
    expect(
      validator.safeParse({
        scenario_id: 'okta-user-to-aws-resources',
        seed_id: 'john.doe@acme.com',
        max_nodes: 10001,
      }).success
    ).toBe(false);
    expect(
      validator.safeParse({
        scenario_id: 'okta-user-to-aws-resources',
        seed_id: 'john.doe@acme.com',
        lookback: '7 days',
      }).success
    ).toBe(false);
    expect(
      validator.safeParse({
        scenario_id: 'okta-user-to-aws-resources',
        seed_id: 'john.doe@acme.com',
        lookback: '7d',
        max_hops: 3,
      }).success
    ).toBe(true);
    expect(
      validator.safeParse({
        scenario_id: 'okta-user-to-aws-resources',
        seed_id: 'john.doe@acme.com',
        exclusions: [{ field: 'entity.id', values: ['arn:aws:iam::1:role/okta-developer'] }],
      }).success
    ).toBe(true);
    expect(
      validator.safeParse({
        scenario_id: 'okta-user-to-aws-resources',
        seed_id: 'john.doe@acme.com',
        exclusions: [{ field: 'entity.id' }],
      }).success
    ).toBe(false);
  });

  it('seeds the node list with the seed entity at hop 0', () => {
    const engine = createWorkflowLiquidEngine();
    const init = findStepByName(parsed.steps, 'init') as Step;
    const [seedNode] = (init.with as { nodes: Array<Record<string, unknown>> }).nodes;
    const context = {
      inputs: { seed_id: 'user:john.doe@acme.com@okta' },
      steps: { load_scenario: { output: { seed: { type: 'user' } } } },
    };

    expect(seedNode).toEqual({
      id: expect.any(String),
      hop: 0,
      via: 'seed',
      type: expect.any(String),
    });
    expect(evaluate(engine, seedNode.id as string, context)).toBe('user:john.doe@acme.com@okta');
    expect(evaluate(engine, seedNode.type as string, context)).toBe('user');
  });

  it('wires the two Security traversal steps around a bounded while loop', () => {
    const load = findStepByName(parsed.steps, 'load_scenario');
    expect(load?.type).toBe('security.loadEntityGraphTraversalScenario');

    const traverse = findStepByName(parsed.steps, 'traverse');
    expect(traverse?.type).toBe('while');
    expect(traverse?.['max-iterations']).toEqual({ limit: 20, 'on-limit': 'continue' });

    const runHop = findStepByName(parsed.steps, 'run_hop');
    expect(runHop?.type).toBe('security.runEntityGraphTraversalHop');
    expect((runHop?.with as Record<string, string>).exclusions).toBe('${{ inputs.exclusions }}');

    const resolve = findStepByName(parsed.steps, 'resolve_nodes');
    expect(resolve?.type).toBe('security.resolveEntityGraphTraversalNodes');
    expect((resolve?.with as Record<string, string>).nodes).toBe('${{ variables.nodes }}');

    const emit = findStepByName(parsed.steps, 'emit');
    expect(emit?.type).toBe('workflow.output');
    expect((emit?.with as Record<string, string>).nodes).toBe(
      '${{ steps.resolve_nodes.output.nodes }}'
    );
  });

  describe('loop templating', () => {
    const engine = createWorkflowLiquidEngine();
    const traverse = findStepByName(parsed.steps, 'traverse') as Step;
    const runHop = findStepByName(parsed.steps, 'run_hop') as Step;
    const condition = traverse.condition as string;
    const hops = [
      { hop_number: 1, name: 'first' },
      { hop_number: 2, name: 'second' },
    ];
    const context = (overrides: Record<string, unknown>) => ({
      steps: { load_scenario: { output: { hops } } },
      variables: { stop_reason: '', hops_executed: 0, ...overrides },
    });

    it('continues while no stop reason is set and hops remain', () => {
      expect(evaluate(engine, condition, context({}))).toBe(true);
      expect(evaluate(engine, condition, context({ hops_executed: 1 }))).toBe(true);
    });

    it('stops when the hop step reports a stop reason', () => {
      expect(evaluate(engine, condition, context({ stop_reason: 'frontier_exhausted' }))).toBe(
        false
      );
    });

    it('stops when every planned hop has run', () => {
      expect(evaluate(engine, condition, context({ hops_executed: 2 }))).toBe(false);
    });

    it('selects the hop for the current iteration', () => {
      const hopTemplate = (runHop.with as Record<string, string>).hop;
      expect(evaluate(engine, hopTemplate, context({ hops_executed: 1 }))).toEqual(hops[1]);
    });
  });
});
