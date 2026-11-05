/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ENTITY_GRAPH_TRAVERSAL_WORKFLOW, ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID } from '.';
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

describe('ENTITY_GRAPH_TRAVERSAL_WORKFLOW', () => {
  const parsed = parse(ENTITY_GRAPH_TRAVERSAL_WORKFLOW.yaml);

  it('is a valid workflow definition', () => {
    const result = WorkflowSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    expect(ENTITY_GRAPH_TRAVERSAL_WORKFLOW.id).toBe(ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID);
    expect(ENTITY_GRAPH_TRAVERSAL_WORKFLOW.pluginId).toBe('entityStore');
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

  it('resolves the seed as hop 0 together with the traversed nodes, once, after the loop', () => {
    const engine = createWorkflowLiquidEngine();
    const init = findStepByName(parsed.steps, 'init') as Step;
    const seedNode = (init.with as { seed_node: Record<string, unknown> }).seed_node;
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

    const resolve = findStepByName(parsed.steps, 'resolve_nodes') as Step;
    expect(resolve.type).toBe('entityStore.resolveEntityGraphTraversalNodes');
    const seed = { id: 'user:john.doe@acme.com@okta', hop: 0, via: 'seed', type: 'user' };
    const nodes = [{ id: 'group-1', hop: 1, via: 'member_of', type: 'group' }];
    expect(
      evaluate(engine, (resolve.with as { nodes: string }).nodes, {
        consts: { empty: [] },
        variables: { seed_node: seed, nodes },
      })
    ).toEqual([seed, ...nodes]);
  });

  it('keeps a small loop state: no frontier, no visited list and no concatenation', () => {
    const init = findStepByName(parsed.steps, 'init') as Step;
    expect(Object.keys(init.with as object).sort()).toEqual([
      'edges',
      'hops_executed',
      'nodes',
      'seed_node',
      'stop_reason',
      'truncated',
      'until_matches',
    ]);
    const advance = findStepByName(parsed.steps, 'advance') as Step;
    expect(advance.with).toEqual({
      edges: '${{ steps.run_hop.output.edges }}',
      nodes: '${{ steps.run_hop.output.nodes }}',
      hops_executed: '${{ steps.run_hop.output.hop_number }}',
      truncated: '${{ steps.run_hop.output.truncated }}',
      stop_reason: '{{ steps.run_hop.output.stop_reason }}',
      until_matches: '${{ steps.run_hop.output.until_matches }}',
    });
  });

  it('wires the traversal steps around a bounded while loop over variables', () => {
    const load = findStepByName(parsed.steps, 'load_scenario');
    expect(load?.type).toBe('entityStore.loadEntityGraphTraversalScenario');

    const traverse = findStepByName(parsed.steps, 'traverse');
    expect(traverse?.type).toBe('while');
    expect(traverse?.['max-iterations']).toEqual({ limit: 20, 'on-limit': 'continue' });

    const runHop = findStepByName(parsed.steps, 'run_hop');
    expect(runHop?.type).toBe('entityStore.runEntityGraphTraversalHop');
    expect(runHop?.with).toMatchObject({
      hop: '${{ steps.load_scenario.output.hops[variables.hops_executed] }}',
      space_id: '${{ steps.load_scenario.output.space_id }}',
      lookup_index: '${{ steps.load_scenario.output.lookup_index }}',
      hops_executed: '${{ variables.hops_executed }}',
      seed_id: '{{ inputs.seed_id }}',
      edges: '${{ variables.edges }}',
      nodes: '${{ variables.nodes }}',
      until_matches: '${{ variables.until_matches }}',
      exclusions: '${{ inputs.exclusions }}',
      until: '${{ steps.load_scenario.output.until }}',
    });

    expect(runHop?.with).not.toHaveProperty('frontier');

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
      variables: { stop_reason: '', hops_executed: 0, edges: [], ...overrides },
    });
    const withTemplate = (key: string) => (runHop.with as Record<string, string>)[key];

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

    it('hands the hop its plan entry and the carried state from variables', () => {
      const edges = [{ hop: 1 }];
      expect(evaluate(engine, withTemplate('hop'), context({}))).toEqual(hops[0]);
      expect(evaluate(engine, withTemplate('hop'), context({ hops_executed: 1 }))).toEqual(hops[1]);
      expect(evaluate(engine, withTemplate('hops_executed'), context({ hops_executed: 1 }))).toBe(
        1
      );
      expect(evaluate(engine, withTemplate('edges'), context({ edges }))).toEqual(edges);
    });
  });

  it('traces routes to the stop-condition matches and emits them', () => {
    const steps = parsed.steps as Array<{
      name: string;
      type: string;
      with: Record<string, unknown>;
    }>;
    const trace = steps.find((s) => s.name === 'trace_routes');
    expect(trace?.type).toBe('entityStore.traceEntityGraphTraversalRoutes');
    expect(trace?.with).toEqual({
      seed_id: '{{ inputs.seed_id }}',
      edges: '${{ variables.edges }}',
      targets: '${{ variables.until_matches }}',
    });
    const emit = steps.find((s) => s.name === 'emit');
    expect(emit?.with).toMatchObject({
      until: '${{ steps.load_scenario.output.until }}',
      until_matches: '${{ variables.until_matches }}',
      routes: '${{ steps.trace_routes.output.routes }}',
    });
    const inputs = (
      parsed.triggers as Array<{ inputs: { properties: Record<string, unknown> } }>
    )[0].inputs.properties;
    expect(inputs.until).toMatchObject({ type: 'array', maxItems: 50 });
  });
});
