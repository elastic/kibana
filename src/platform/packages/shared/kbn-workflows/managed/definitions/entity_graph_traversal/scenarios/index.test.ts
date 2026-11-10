/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AWS_ROLE_BLAST_RADIUS_SCENARIO_ID,
  ENDPOINT_SHARED_INDICATOR_SPREAD_SCENARIO_ID,
  ENTITY_GRAPH_TRAVERSAL_DEFAULT_LIMITS,
  ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS,
  entityGraphTraversalRelationshipField,
  entityGraphTraversalRelationshipKey,
  entityGraphTraversalScenarioDefinitions,
  entityGraphTraversalScenarioSchema,
  getEntityGraphTraversalScenario,
  listEntityGraphTraversalScenarioIds,
  loadEntityGraphTraversalPlan,
  OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID,
  parseEntityGraphTraversalScenario,
  resolveEntityGraphTraversalLimits,
} from '.';

describe('entity graph traversal scenarios', () => {
  it('registers unique ids', () => {
    const ids = listEntityGraphTraversalScenarioIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID,
        AWS_ROLE_BLAST_RADIUS_SCENARIO_ID,
        ENDPOINT_SHARED_INDICATOR_SPREAD_SCENARIO_ID,
      ])
    );
  });

  it.each(entityGraphTraversalScenarioDefinitions.map((d) => [d.id, d] as const))(
    '%s parses, validates, and declares its registered id',
    (id, definition) => {
      const scenario = parseEntityGraphTraversalScenario(definition.yaml);
      expect(scenario.id).toBe(id);
      expect(scenario.hops.length).toBeGreaterThan(0);
      for (const hop of scenario.hops) {
        // Every limit a scenario sets must already respect the ceiling the schema enforces.
        expect(hop.repeat).toBeLessThanOrEqual(ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_hops);
      }
    }
  );

  it('returns undefined for an unknown scenario id', () => {
    expect(getEntityGraphTraversalScenario('does-not-exist')).toBeUndefined();
    expect(loadEntityGraphTraversalPlan('does-not-exist')).toBeUndefined();
  });

  describe('okta-user-to-aws-resources plan', () => {
    const plan = loadEntityGraphTraversalPlan(OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID);

    it('unrolls the repeated asset hop after the two Okta hops and walks outward', () => {
      expect(plan).toBeDefined();
      expect(plan?.direction).toBe('out');
      expect(plan?.hops.map((h) => h.name)).toEqual([
        'okta_groups',
        'okta_federation_roles',
        'aws_asset_relationships',
        'aws_asset_relationships',
        'aws_asset_relationships',
        'aws_asset_relationships',
        'aws_asset_relationships',
      ]);
      expect(plan?.hops.map((h) => h.hop_number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('matches every hop on entity.id and reads each relationship from its ids field', () => {
      const groups = plan?.hops[0];
      expect(groups?.match_field).toBe('entity.id');
      expect(groups?.target_fields).toEqual([
        { field: 'entity.relationships.member_of.ids', relation: 'member_of' },
      ]);
      expect(groups).toMatchObject({ source_type: 'user', target_type: 'group' });
      const federation = plan?.hops[1];
      expect(federation?.target_fields).toEqual([
        { field: 'entity.relationships.sso_to_role.ids', relation: 'sso_to_role' },
      ]);
      expect(federation).toMatchObject({ source_type: 'group', target_type: 'role' });
      const assets = plan?.hops[2];
      expect(assets?.match_field).toBe('entity.id');
      expect(assets?.target_fields.map((t) => t.relation)).toEqual([
        'can_assume',
        'can_connect',
        'runs_as',
        'grants_access_to',
      ]);
      expect(assets?.payload_fields).toEqual(['entity.name', 'entity.sub_type']);
      expect(assets?.filter).toBeUndefined();
    });

    it('truncates the hop list to a smaller max_hops override', () => {
      const short = loadEntityGraphTraversalPlan(OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID, {
        max_hops: 2,
      });
      expect(short?.hops).toHaveLength(2);
      expect(short?.limits.max_hops).toBe(2);
    });
  });

  describe('endpoint-shared-indicator-spread plan', () => {
    const plan = loadEntityGraphTraversalPlan(ENDPOINT_SHARED_INDICATOR_SPREAD_SCENARIO_ID);

    it('repeats one indicator hop and walks in both directions', () => {
      expect(plan?.direction).toBe('both');
      expect(plan?.seed).toMatchObject({ type: 'host' });
      expect(plan?.hops).toHaveLength(6);
      expect(new Set(plan?.hops.map((h) => h.name))).toEqual(new Set(['shared_indicators']));
      expect(plan?.hops[0]).toMatchObject({
        match_field: 'entity.id',
        source_type: 'host',
        target_type: 'indicator',
      });
      expect(plan?.hops[0]?.target_fields).toEqual([
        { field: 'entity.relationships.executed.ids', relation: 'executed' },
        { field: 'entity.relationships.dropped.ids', relation: 'dropped' },
        { field: 'entity.relationships.connected_to.ids', relation: 'connected_to' },
      ]);
    });
  });

  describe('relationship fields', () => {
    it('names the ids field of a key and reads the key back off a field', () => {
      expect(entityGraphTraversalRelationshipField('can_assume')).toBe(
        'entity.relationships.can_assume.ids'
      );
      expect(entityGraphTraversalRelationshipKey('entity.relationships.can_assume.ids')).toBe(
        'can_assume'
      );
      expect(entityGraphTraversalRelationshipKey('entity.name')).toBeUndefined();
    });
  });

  describe('limits', () => {
    it('falls back to defaults when neither scenario nor run sets a value', () => {
      expect(resolveEntityGraphTraversalLimits(undefined, undefined)).toEqual(
        ENTITY_GRAPH_TRAVERSAL_DEFAULT_LIMITS
      );
    });

    it('lets the run override the scenario and clamps both to the hard ceiling', () => {
      const limits = resolveEntityGraphTraversalLimits(
        { max_nodes: 100, max_frontier: 50 },
        { max_nodes: 1_000_000, hub_degree: 0 }
      );
      expect(limits.max_nodes).toBe(ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_nodes);
      expect(limits.max_frontier).toBe(50);
      expect(limits.hub_degree).toBe(1);
    });
  });

  describe('schema', () => {
    const valid = () =>
      parseEntityGraphTraversalScenario(entityGraphTraversalScenarioDefinitions[0].yaml);

    it('rejects a filter that could append ES|QL commands', () => {
      const scenario = valid();
      scenario.hops[0].filter = 'entity.type == "Host" | DROP entity.id';
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);
    });

    it('rejects a relationship key that is not a stored key name', () => {
      const scenario = valid();
      scenario.hops[0].relationships = ['can_assume` OR 1==1'];
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);

      const empty = valid();
      empty.hops[0].relationships = [];
      expect(entityGraphTraversalScenarioSchema.safeParse(empty).success).toBe(false);
    });

    it('accepts only out and both as directions, defaulting to out', () => {
      const scenario = valid();
      scenario.direction = 'in' as unknown as 'out';
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);

      const { direction, ...withoutDirection } = valid();
      const parsed = entityGraphTraversalScenarioSchema.parse(withoutDirection);
      expect(parsed.direction).toBe('out');
    });

    it('rejects limits above the hard ceiling', () => {
      const scenario = valid();
      scenario.limits = { max_nodes: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_nodes + 1 };
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);
    });
  });
});
