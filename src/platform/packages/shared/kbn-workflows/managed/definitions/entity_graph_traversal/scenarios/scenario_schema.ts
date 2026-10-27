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
  max_nodes: 10_000,
  /** Ids expanded per hop; the ES|QL `IN (...)` parameter count. */
  max_frontier: 1_000,
  /** Rows one hop query may return (`LIMIT`). */
  max_edges_per_hop: 10_000,
  /** Edges accumulated across the run. Bounds the workflow state. */
  max_edges_total: 10_000,
  /** A frontier node with more distinct targets than this is not expanded. */
  hub_degree: 10_000,
} as const;

/**
 * Defaults applied when neither the scenario nor the run sets a limit.
 */
export const ENTITY_GRAPH_TRAVERSAL_DEFAULT_LIMITS = {
  max_hops: 6,
  max_nodes: 2_000,
  max_frontier: 500,
  max_edges_per_hop: 5_000,
  max_edges_total: 5_000,
  hub_degree: 500,
} as const;

/** Entries in one hop's `target_fields` and `payload_fields`. */
export const MAX_TARGET_FIELDS_PER_HOP = 8;
export const MAX_PAYLOAD_FIELDS_PER_HOP = 5;
/** Entries in `hops` (before `repeat`). */
export const MAX_HOP_SPECS_PER_SCENARIO = 20;

/**
 * Entity store entity types a hop may match by EUID. Mirrors the store's `EntityType` enum;
 * kept literal here so this package does not depend on the entity store.
 */
export const ENTITY_GRAPH_TRAVERSAL_EUID_TYPES = ['user', 'host', 'service', 'generic'] as const;

export type EntityGraphTraversalEuidType = (typeof ENTITY_GRAPH_TRAVERSAL_EUID_TYPES)[number];

/**
 * Value types a `match_fields` entry may declare. ES|QL rejects a whole query when a bound
 * value cannot be cast to the field's type, so a hop that matches a mixed frontier (hashes
 * and addresses, say) against an `ip` field binds only the values of that type to it.
 */
export const ENTITY_GRAPH_TRAVERSAL_MATCH_VALUE_TYPES = ['ip'] as const;

export type EntityGraphTraversalMatchValueType =
  (typeof ENTITY_GRAPH_TRAVERSAL_MATCH_VALUE_TYPES)[number];

type LimitKey = keyof typeof ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS;

const LIMIT_KEYS = Object.keys(ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS) as LimitKey[];

/**
 * A field name as it appears in an ES|QL query. Dotted ECS paths and `@timestamp` are
 * allowed; anything that could close a backtick-quoted identifier is not.
 */
export const ESQL_FIELD_NAME_PATTERN = /^[A-Za-z_@][A-Za-z0-9_.@-]*$/;

/**
 * An index pattern as accepted by ES|QL `FROM`: names, wildcards, comma lists and
 * remote-cluster prefixes. No whitespace, quotes or pipes.
 */
export const INDEX_PATTERN_PATTERN = /^[A-Za-z0-9_.*,:-]+$/;

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
 * An ES|QL boolean expression AND-ed onto the hop's `WHERE`. Scenario YAML ships inside
 * Kibana, so the expression is trusted, but a pipe or a newline would let it append whole
 * commands, which is never what a filter means.
 */
const esqlFilterExpression = () =>
  z
    .string()
    .min(1)
    .max(1_000)
    .refine((value) => !/[|\n\r]/.test(value), {
      message: 'filter must be a single ES|QL boolean expression without pipes or newlines',
    });

const targetFieldSchema = () =>
  z.union([
    esqlFieldName(),
    z.object({
      field: esqlFieldName(),
      relation: z.string().min(1).max(64),
    }),
  ]);

const matchFieldSchema = () =>
  z.union([
    esqlFieldName(),
    z.object({
      field: esqlFieldName(),
      value_type: z.enum(ENTITY_GRAPH_TRAVERSAL_MATCH_VALUE_TYPES).optional(),
    }),
  ]);

export const entityGraphTraversalHopSchema = lazySchema(() =>
  z
    .object({
      name: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z][a-z0-9_]*$/, 'hop name must be snake_case'),
      description: z.string().max(1_000).optional(),
      index: z.string().min(1).max(512).regex(INDEX_PATTERN_PATTERN),
      /** Match the frontier against this stored field. Exactly one of match_field / match_fields / match_euid. */
      match_field: esqlFieldName().optional(),
      /**
       * Match the frontier against any of these stored fields (OR). For a frontier that mixes
       * value kinds, an entry may declare the `value_type` its field holds so only values of
       * that type are bound to it.
       */
      match_fields: z.array(matchFieldSchema()).min(1).max(MAX_TARGET_FIELDS_PER_HOP).optional(),
      /**
       * Match the frontier against the entity store EUID computed from each document with the
       * named entity type's identity rules. The frontier values are then EUIDs such as
       * `user:john.doe@acme.com@okta`.
       */
      match_euid: z.enum(ENTITY_GRAPH_TRAVERSAL_EUID_TYPES).optional(),
      /** Fields whose values become the next frontier. Exactly one of target_fields / target_euid. */
      target_fields: z.array(targetFieldSchema()).min(1).max(MAX_TARGET_FIELDS_PER_HOP).optional(),
      /**
       * Emit, as the target, the entity store EUID computed from each document with the named
       * entity type's identity rules, labelled with the hop's `relation`. The reached nodes are
       * then store ids (`host:...`) that later hops can match with `match_euid`.
       */
      target_euid: z.enum(ENTITY_GRAPH_TRAVERSAL_EUID_TYPES).optional(),
      payload_fields: z.array(esqlFieldName()).max(MAX_PAYLOAD_FIELDS_PER_HOP).optional(),
      filter: esqlFilterExpression().optional(),
      /** Relation label for edges whose target field does not name its own. */
      relation: z.string().min(1).max(64).optional(),
      /** When set, a run's `lookback` input is applied to this hop as `time_field >= NOW() - lookback`. */
      time_field: esqlFieldName().optional(),
      source_type: z.string().min(1).max(64).optional(),
      target_type: z.string().min(1).max(64).optional(),
      /** How many consecutive hops reuse this spec. */
      repeat: z.number().int().min(1).max(ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_hops).default(1),
    })
    .refine(
      (hop) =>
        [hop.match_field, hop.match_fields, hop.match_euid].filter((v) => v !== undefined)
          .length === 1,
      { message: 'a hop must set exactly one of match_field, match_fields or match_euid' }
    )
    .refine((hop) => (hop.target_fields === undefined) !== (hop.target_euid === undefined), {
      message: 'a hop must set exactly one of target_fields or target_euid',
    })
    .refine((hop) => hop.target_euid === undefined || hop.relation !== undefined, {
      message: 'a hop with target_euid must set relation',
    })
);

export type EntityGraphTraversalHopSpec = z.infer<typeof entityGraphTraversalHopSchema>;

export const entityGraphTraversalScenarioSchema = lazySchema(() =>
  z.object({
    version: z.literal('1'),
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
    limits: entityGraphTraversalLimitOverridesSchema.optional(),
    hops: z.array(entityGraphTraversalHopSchema).min(1).max(MAX_HOP_SPECS_PER_SCENARIO),
  })
);

export type EntityGraphTraversalScenario = z.infer<typeof entityGraphTraversalScenarioSchema>;

/**
 * One hop as the workflow executes it: `repeat` is unrolled, every target field carries a
 * relation label, and `hop_number` is the 1-based position in the run. Exactly one of
 * `match_field` / `match_fields` / `match_euid` is set, and exactly one of `target_fields` /
 * `target_euid` is populated.
 */
export interface EntityGraphTraversalExpandedHop {
  hop_number: number;
  name: string;
  index: string;
  match_field?: string;
  match_fields?: Array<{ field: string; value_type?: EntityGraphTraversalMatchValueType }>;
  match_euid?: EntityGraphTraversalEuidType;
  /** Empty when the hop targets an EUID. */
  target_fields: Array<{ field: string; relation: string }>;
  target_euid?: { type: EntityGraphTraversalEuidType; relation: string };
  payload_fields: string[];
  filter?: string;
  time_field?: string;
  source_type?: string;
  target_type?: string;
}

export interface EntityGraphTraversalPlan {
  id: string;
  name: string;
  description?: string;
  seed: EntityGraphTraversalScenario['seed'];
  limits: EntityGraphTraversalLimits;
  hops: EntityGraphTraversalExpandedHop[];
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
        index: hop.index,
        ...(hop.match_field !== undefined && { match_field: hop.match_field }),
        ...(hop.match_fields !== undefined && {
          match_fields: hop.match_fields.map((match) =>
            typeof match === 'string'
              ? { field: match }
              : {
                  field: match.field,
                  ...(match.value_type !== undefined && { value_type: match.value_type }),
                }
          ),
        }),
        ...(hop.match_euid !== undefined && { match_euid: hop.match_euid }),
        target_fields: (hop.target_fields ?? []).map((target) =>
          typeof target === 'string'
            ? { field: target, relation: hop.relation ?? target }
            : { field: target.field, relation: target.relation }
        ),
        ...(hop.target_euid !== undefined &&
          hop.relation !== undefined && {
            target_euid: { type: hop.target_euid, relation: hop.relation },
          }),
        payload_fields: hop.payload_fields ?? [],
        ...(hop.filter !== undefined && { filter: hop.filter }),
        ...(hop.time_field !== undefined && { time_field: hop.time_field }),
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
    limits,
    hops: expandEntityGraphTraversalHops(scenario, limits),
  };
};
