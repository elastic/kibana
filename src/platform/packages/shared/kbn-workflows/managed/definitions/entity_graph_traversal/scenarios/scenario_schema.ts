/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod/v4';

/**
 * Hard ceilings for a traversal run. A scenario may set lower defaults and a run may
 * override them, but nothing can raise them: they bound the ES|QL parameter list, the rows
 * read per hop, and the state the workflow keeps in memory between hops.
 */
export const ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS = {
  /** Expanded hops (after `repeat`) per run; also the `while` iteration cap in the workflow. */
  max_hops: 20,
  /** Distinct node ids admitted, including the seed. Bounds the visited set. */
  max_nodes: 5_000,
  /** Ids expanded per hop; the ES|QL `IN (...)` parameter count. */
  max_frontier: 500,
  /** Rows one hop query may return (`LIMIT`). */
  max_edges_per_hop: 5_000,
  /** Edges accumulated across the run. Bounds the workflow state. */
  max_edges_total: 5_000,
  /** A frontier node with more distinct targets than this is not expanded. */
  hub_degree: 5_000,
} as const;

/**
 * Defaults applied when neither the scenario nor the run sets a limit.
 */
export const ENTITY_GRAPH_TRAVERSAL_DEFAULT_LIMITS = {
  max_hops: 6,
  max_nodes: 1_000,
  max_frontier: 250,
  max_edges_per_hop: 2_000,
  max_edges_total: 2_000,
  hub_degree: 200,
} as const;

/** Relationship keys one hop may follow, and payload fields it may read. */
export const MAX_RELATIONSHIPS_PER_HOP = 8;
export const MAX_PAYLOAD_FIELDS_PER_HOP = 5;
/** Entries in `hops` (before `repeat`). */
export const MAX_HOP_SPECS_PER_SCENARIO = 20;

/**
 * Entity store entity types. Mirrors the store's `EntityType` enum; kept literal here so this
 * package does not depend on the entity store.
 */
export const ENTITY_GRAPH_TRAVERSAL_EUID_TYPES = ['user', 'host', 'service', 'generic'] as const;

export type EntityGraphTraversalEuidType = (typeof ENTITY_GRAPH_TRAVERSAL_EUID_TYPES)[number];

/**
 * The graph lives in the entity store's latest index: every node is an entity document, its
 * `entity.id` is the node id (the store EUID), and every edge is an entry in one of the
 * document's `entity.relationships.<key>.ids` arrays, holding the target's `entity.id`.
 */
export const ENTITY_GRAPH_TRAVERSAL_NODE_ID_FIELD = 'entity.id';

export const entityGraphTraversalRelationshipField = (key: string): string =>
  `entity.relationships.${key}.ids`;

/** The relationship key an `entity.relationships.<key>.ids` field holds, or undefined. */
export const entityGraphTraversalRelationshipKey = (field: string): string | undefined => {
  const match = field.match(/^entity\.relationships\.([a-z][a-z0-9_]*)\.ids$/);
  return match ? match[1] : undefined;
};

/**
 * Which way a walk follows the stored edges. `out` follows a node's own relationship ids;
 * `both` also reaches the nodes whose relationships point at the frontier, so a walk can go
 * host, indicator, host over edges that only the hosts carry.
 */
export const ENTITY_GRAPH_TRAVERSAL_DIRECTIONS = ['out', 'both'] as const;

export type EntityGraphTraversalDirection = (typeof ENTITY_GRAPH_TRAVERSAL_DIRECTIONS)[number];

type LimitKey = keyof typeof ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS;

const LIMIT_KEYS = Object.keys(ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS) as LimitKey[];

/**
 * A field name as it appears in an ES|QL query. Dotted ECS paths and `@timestamp` are
 * allowed; anything that could close a backtick-quoted identifier is not.
 */
export const ESQL_FIELD_NAME_PATTERN = /^[A-Za-z_@][A-Za-z0-9_.@-]*$/;

/** A relationship key as stored under `entity.relationships`. */
export const RELATIONSHIP_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/** A lookback such as `24h`, `7d` or `30m`. */
export const LOOKBACK_PATTERN = /^[0-9]{1,5}(m|h|d)$/;

const limitSchema = (key: LimitKey) =>
  z.number().int().min(1).max(ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS[key]);

export const entityGraphTraversalLimitsSchema = lazySchema(() =>
  z.object({
    max_hops: limitSchema('max_hops'),
    max_nodes: limitSchema('max_nodes'),
    max_frontier: limitSchema('max_frontier'),
    max_edges_per_hop: limitSchema('max_edges_per_hop'),
    max_edges_total: limitSchema('max_edges_total'),
    hub_degree: limitSchema('hub_degree'),
  })
);

export type EntityGraphTraversalLimits = z.infer<typeof entityGraphTraversalLimitsSchema>;

export const entityGraphTraversalLimitOverridesSchema = lazySchema(() =>
  entityGraphTraversalLimitsSchema.partial()
);

export type EntityGraphTraversalLimitOverrides = z.infer<
  typeof entityGraphTraversalLimitOverridesSchema
>;

const esqlFieldName = () => z.string().min(1).max(256).regex(ESQL_FIELD_NAME_PATTERN);

/**
 * An ES|QL boolean expression over the entity document a hop expands, AND-ed onto the hop's
 * `WHERE`. Scenario YAML ships inside Kibana, so the expression is trusted, but a pipe or a
 * newline would let it append whole commands, which is never what a filter means.
 */
const esqlFilterExpression = () =>
  z
    .string()
    .min(1)
    .max(1_000)
    .refine((value) => !/[|\n\r]/.test(value), {
      message: 'filter must be a single ES|QL boolean expression without pipes or newlines',
    });

export const entityGraphTraversalHopSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z0-9_]*$/, 'hop name must be snake_case'),
    description: z.string().max(1_000).optional(),
    /** Relationship keys followed on this hop; each becomes the relation label of its edges. */
    relationships: z
      .array(z.string().min(1).max(64).regex(RELATIONSHIP_KEY_PATTERN))
      .min(1)
      .max(MAX_RELATIONSHIPS_PER_HOP),
    /** Fields of the expanded entity document carried on its edges, for example `entity.name`. */
    payload_fields: z.array(esqlFieldName()).max(MAX_PAYLOAD_FIELDS_PER_HOP).optional(),
    /** Only expand entity documents matching this, for example `entity.source == "okta"`. */
    filter: esqlFilterExpression().optional(),
    /** Display type hints for nodes reached on the frontier side and on the pointed side. */
    source_type: z.string().min(1).max(64).optional(),
    target_type: z.string().min(1).max(64).optional(),
    /** How many consecutive hops reuse this spec. */
    repeat: z.number().int().min(1).max(ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_hops).default(1),
  })
);

export type EntityGraphTraversalHopSpec = z.infer<typeof entityGraphTraversalHopSchema>;

/** Stop the walk once a node matching one of these is admitted; same shape as an exclusion. */
export const entityGraphTraversalStopConditionSchema = lazySchema(() =>
  z.object({
    field: esqlFieldName(),
    values: z.array(z.string().min(1).max(2_048)).min(1).max(100),
  })
);

export type EntityGraphTraversalStopCondition = z.infer<
  typeof entityGraphTraversalStopConditionSchema
>;

export const entityGraphTraversalScenarioSchema = lazySchema(() =>
  z.object({
    version: z.literal('2'),
    id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z][a-z0-9-]*$/, 'scenario id must be kebab-case'),
    name: z.string().min(1).max(256),
    description: z.string().max(4_000).optional(),
    seed: z.object({
      type: z.string().min(1).max(64),
      description: z.string().max(1_000).optional(),
    }),
    direction: z.enum(ENTITY_GRAPH_TRAVERSAL_DIRECTIONS).default('out'),
    limits: entityGraphTraversalLimitOverridesSchema.optional(),
    hops: z.array(entityGraphTraversalHopSchema).min(1).max(MAX_HOP_SPECS_PER_SCENARIO),
    /**
     * Stop conditions the scenario itself declares (a reachability scenario). On `entity.id`
     * the values are node ids; on another field they are matched against the payload of the
     * edge that reached the node, and the hop step reads that field as payload whether or not
     * it is a `payload_fields` entry.
     */
    until: z.array(entityGraphTraversalStopConditionSchema).max(50).optional(),
  })
);

export type EntityGraphTraversalScenario = z.infer<typeof entityGraphTraversalScenarioSchema>;

/**
 * One hop as the workflow executes it: `repeat` is unrolled, the relationship keys are the
 * stored fields the hop reads, and `hop_number` is the 1-based position in the run. The
 * frontier is matched on `match_field` (always `entity.id`) and every target field names the
 * relation its values carry.
 */
export interface EntityGraphTraversalExpandedHop {
  hop_number: number;
  name: string;
  match_field: string;
  target_fields: Array<{ field: string; relation: string }>;
  payload_fields: string[];
  filter?: string;
  source_type?: string;
  target_type?: string;
}

export interface EntityGraphTraversalPlan {
  id: string;
  name: string;
  description?: string;
  seed: EntityGraphTraversalScenario['seed'];
  direction: EntityGraphTraversalDirection;
  limits: EntityGraphTraversalLimits;
  hops: EntityGraphTraversalExpandedHop[];
  /** The scenario's stop conditions; empty when it declares none. */
  until: EntityGraphTraversalStopCondition[];
}

/**
 * Resolve the effective limits for a run: hard ceiling, then default, then the scenario's
 * value, then the run override, each clamped to the ceiling.
 */
export const resolveEntityGraphTraversalLimits = (
  scenarioLimits: EntityGraphTraversalLimitOverrides | undefined,
  overrides: EntityGraphTraversalLimitOverrides | undefined
): EntityGraphTraversalLimits => {
  const resolved = {} as Record<LimitKey, number>;
  for (const key of LIMIT_KEYS) {
    const requested =
      overrides?.[key] ?? scenarioLimits?.[key] ?? ENTITY_GRAPH_TRAVERSAL_DEFAULT_LIMITS[key];
    resolved[key] = Math.max(1, Math.min(requested, ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS[key]));
  }
  return resolved;
};

/**
 * Unroll a scenario into the hop list a run executes, truncated to `limits.max_hops`.
 */
export const expandEntityGraphTraversalHops = (
  scenario: EntityGraphTraversalScenario,
  limits: EntityGraphTraversalLimits
): EntityGraphTraversalExpandedHop[] => {
  const expanded: EntityGraphTraversalExpandedHop[] = [];
  for (const hop of scenario.hops) {
    for (let i = 0; i < hop.repeat; i++) {
      if (expanded.length >= limits.max_hops) return expanded;
      expanded.push({
        hop_number: expanded.length + 1,
        name: hop.name,
        match_field: ENTITY_GRAPH_TRAVERSAL_NODE_ID_FIELD,
        target_fields: hop.relationships.map((key) => ({
          field: entityGraphTraversalRelationshipField(key),
          relation: key,
        })),
        payload_fields: hop.payload_fields ?? [],
        ...(hop.filter !== undefined && { filter: hop.filter }),
        ...(hop.source_type !== undefined && { source_type: hop.source_type }),
        ...(hop.target_type !== undefined && { target_type: hop.target_type }),
      });
    }
  }
  return expanded;
};

/**
 * Build the executable plan for a scenario and a run's limit overrides.
 */
export const buildEntityGraphTraversalPlan = (
  scenario: EntityGraphTraversalScenario,
  overrides?: EntityGraphTraversalLimitOverrides
): EntityGraphTraversalPlan => {
  const limits = resolveEntityGraphTraversalLimits(scenario.limits, overrides);
  return {
    id: scenario.id,
    name: scenario.name,
    ...(scenario.description !== undefined && { description: scenario.description }),
    seed: scenario.seed,
    direction: scenario.direction,
    limits,
    hops: expandEntityGraphTraversalHops(scenario, limits),
    until: scenario.until ?? [],
  };
};
