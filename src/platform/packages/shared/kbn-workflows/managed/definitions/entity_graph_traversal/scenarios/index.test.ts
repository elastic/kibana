/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AWS_CLOUDTRAIL_OBSERVED_ACTIVITY_SCENARIO_ID,
  AWS_ROLE_BLAST_RADIUS_SCENARIO_ID,
  ENDPOINT_SHARED_INDICATOR_SPREAD_SCENARIO_ID,
  ENTITY_GRAPH_TRAVERSAL_DEFAULT_LIMITS,
  ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS,
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
        AWS_CLOUDTRAIL_OBSERVED_ACTIVITY_SCENARIO_ID,
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

    it('unrolls the repeated asset hop after the Okta hop', () => {
      expect(plan).toBeDefined();
      expect(plan?.hops.map((h) => h.name)).toEqual([
        'okta_federation_roles',
        'aws_asset_relationships',
        'aws_asset_relationships',
        'aws_asset_relationships',
        'aws_asset_relationships',
        'aws_asset_relationships',
      ]);
      expect(plan?.hops.map((h) => h.hop_number)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('matches the first hop by user EUID and the asset hops by entity.id', () => {
      expect(plan?.hops[0]).toMatchObject({ match_euid: 'user' });
      expect(plan?.hops[0]?.match_field).toBeUndefined();
      expect(plan?.hops[1]).toMatchObject({ match_field: 'entity.id' });
      expect(plan?.hops[1]?.match_euid).toBeUndefined();
    });

    it('labels every target field with a relation', () => {
      const okta = plan?.hops[0];
      expect(okta?.target_fields).toEqual([
        { field: 'user.entity.relationships.can_assume.entity.id', relation: 'can_assume' },
      ]);
      const assets = plan?.hops[1];
      expect(assets?.target_fields.map((t) => t.relation)).toEqual([
        'can_assume',
        'can_connect',
        'runs_as',
        'grants_access_to',
      ]);
      expect(assets?.filter).toBe('cloud.provider == "aws"');
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

    it('alternates the host and indicator hops three times', () => {
      expect(plan?.hops.map((h) => h.name)).toEqual([
        'host_to_indicators',
        'indicators_to_hosts',
        'host_to_indicators',
        'indicators_to_hosts',
        'host_to_indicators',
        'indicators_to_hosts',
      ]);
      expect(plan?.seed).toMatchObject({ type: 'host' });
    });

    it('reads indicators from a host matched by EUID and keeps private destinations out', () => {
      const hostHop = plan?.hops[0];
      expect(hostHop).toMatchObject({ match_euid: 'host', target_type: 'indicator' });
      expect(hostHop?.target_fields).toEqual([
        { field: 'process.hash.sha256', relation: 'executed' },
        { field: 'file.hash.sha256', relation: 'dropped' },
        { field: 'destination.ip', relation: 'connected_to' },
      ]);
      expect(hostHop?.filter).toContain('CIDR_MATCH(destination.ip');
      expect(hostHop?.target_euid).toBeUndefined();
    });

    it('matches the mixed indicator frontier against several fields and targets the host EUID', () => {
      const indicatorHop = plan?.hops[1];
      expect(indicatorHop?.match_field).toBeUndefined();
      expect(indicatorHop?.match_euid).toBeUndefined();
      expect(indicatorHop?.match_fields).toEqual([
        { field: 'process.hash.sha256' },
        { field: 'file.hash.sha256' },
        { field: 'destination.ip', value_type: 'ip' },
      ]);
      expect(indicatorHop?.target_fields).toEqual([]);
      expect(indicatorHop?.target_euid).toEqual({ type: 'host', relation: 'observed_on' });
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
      scenario.hops[0].filter = 'event.kind == "asset" | DROP user.email';
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);
    });

    it('rejects field names and index patterns with quoting or whitespace', () => {
      const scenario = valid();
      scenario.hops[1].match_field = 'entity.id` OR 1==1';
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);

      const other = valid();
      other.hops[0].index = 'logs-* | DROP x';
      expect(entityGraphTraversalScenarioSchema.safeParse(other).success).toBe(false);
    });

    it('rejects a hop that sets both or neither of match_field and match_euid', () => {
      const both = valid();
      both.hops[0].match_field = 'user.email';
      both.hops[0].match_euid = 'user';
      expect(entityGraphTraversalScenarioSchema.safeParse(both).success).toBe(false);

      const neither = valid();
      delete neither.hops[0].match_field;
      delete neither.hops[0].match_euid;
      expect(entityGraphTraversalScenarioSchema.safeParse(neither).success).toBe(false);
    });

    it('rejects a hop that combines match_fields with another match, or sets no target', () => {
      const scenario = valid();
      scenario.hops[1].match_fields = ['entity.id'];
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);

      const noTarget = valid();
      delete noTarget.hops[1].target_fields;
      expect(entityGraphTraversalScenarioSchema.safeParse(noTarget).success).toBe(false);
    });

    it('requires a relation for an EUID target and refuses it next to target fields', () => {
      const withoutRelation = valid();
      delete withoutRelation.hops[1].target_fields;
      withoutRelation.hops[1].target_euid = 'host';
      expect(entityGraphTraversalScenarioSchema.safeParse(withoutRelation).success).toBe(false);

      withoutRelation.hops[1].relation = 'observed_on';
      expect(entityGraphTraversalScenarioSchema.safeParse(withoutRelation).success).toBe(true);

      const both = valid();
      both.hops[1].target_euid = 'host';
      both.hops[1].relation = 'observed_on';
      expect(entityGraphTraversalScenarioSchema.safeParse(both).success).toBe(false);
    });

    it('rejects a match_fields value type it does not know', () => {
      const scenario = valid();
      delete scenario.hops[1].match_field;
      scenario.hops[1].match_fields = [
        { field: 'destination.ip', value_type: 'date' as unknown as 'ip' },
      ];
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);
    });

    it('accepts scenario stop conditions and exposes them on the plan', () => {
      const scenario = valid();
      scenario.until = [{ field: 'entity.id', values: ['arn:aws:s3:::crown-jewels'] }];
      const parsed = entityGraphTraversalScenarioSchema.safeParse(scenario);
      expect(parsed.success).toBe(true);
      expect(loadEntityGraphTraversalPlan(OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID)?.until).toEqual(
        []
      );

      const bad = valid();
      bad.until = [{ field: 'entity.id', values: [] }];
      expect(entityGraphTraversalScenarioSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects limits above the hard ceiling', () => {
      const scenario = valid();
      scenario.limits = { max_nodes: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_nodes + 1 };
      expect(entityGraphTraversalScenarioSchema.safeParse(scenario).success).toBe(false);
    });
  });
});
