/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import AWS_CLOUDTRAIL_OBSERVED_ACTIVITY_YAML from './aws_cloudtrail_observed_activity.yaml';
import AWS_ROLE_BLAST_RADIUS_YAML from './aws_role_blast_radius.yaml';
import ENDPOINT_SHARED_INDICATOR_SPREAD_YAML from './endpoint_shared_indicator_spread.yaml';
import OKTA_USER_TO_AWS_RESOURCES_YAML from './okta_user_to_aws_resources.yaml';
import {
  buildEntityGraphTraversalPlan,
  type EntityGraphTraversalLimitOverrides,
  type EntityGraphTraversalPlan,
  type EntityGraphTraversalScenario,
  entityGraphTraversalScenarioSchema,
} from './scenario_schema';

export {
  ENTITY_GRAPH_TRAVERSAL_DEFAULT_LIMITS,
  ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS,
  ENTITY_GRAPH_TRAVERSAL_MATCH_VALUE_TYPES,
  ESQL_FIELD_NAME_PATTERN,
  INDEX_PATTERN_PATTERN,
  LOOKBACK_PATTERN,
  MAX_HOP_SPECS_PER_SCENARIO,
  MAX_PAYLOAD_FIELDS_PER_HOP,
  MAX_TARGET_FIELDS_PER_HOP,
  buildEntityGraphTraversalPlan,
  entityGraphTraversalHopSchema,
  entityGraphTraversalLimitOverridesSchema,
  entityGraphTraversalLimitsSchema,
  entityGraphTraversalScenarioSchema,
  entityGraphTraversalStopConditionSchema,
  expandEntityGraphTraversalHops,
  resolveEntityGraphTraversalLimits,
} from './scenario_schema';
export type {
  EntityGraphTraversalExpandedHop,
  EntityGraphTraversalHopSpec,
  EntityGraphTraversalMatchValueType,
  EntityGraphTraversalLimitOverrides,
  EntityGraphTraversalLimits,
  EntityGraphTraversalPlan,
  EntityGraphTraversalScenario,
  EntityGraphTraversalStopCondition,
} from './scenario_schema';

/**
 * A scenario as shipped: its id and the YAML source. One entry per file in this folder.
 */
export interface EntityGraphTraversalScenarioDefinition {
  id: string;
  yaml: string;
}

export const OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID = 'okta-user-to-aws-resources';
export const AWS_ROLE_BLAST_RADIUS_SCENARIO_ID = 'aws-role-blast-radius';
export const AWS_CLOUDTRAIL_OBSERVED_ACTIVITY_SCENARIO_ID = 'aws-cloudtrail-observed-activity';
export const ENDPOINT_SHARED_INDICATOR_SPREAD_SCENARIO_ID = 'endpoint-shared-indicator-spread';

export const entityGraphTraversalScenarioDefinitions = [
  { id: OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID, yaml: OKTA_USER_TO_AWS_RESOURCES_YAML },
  { id: AWS_ROLE_BLAST_RADIUS_SCENARIO_ID, yaml: AWS_ROLE_BLAST_RADIUS_YAML },
  {
    id: AWS_CLOUDTRAIL_OBSERVED_ACTIVITY_SCENARIO_ID,
    yaml: AWS_CLOUDTRAIL_OBSERVED_ACTIVITY_YAML,
  },
  { id: ENDPOINT_SHARED_INDICATOR_SPREAD_SCENARIO_ID, yaml: ENDPOINT_SHARED_INDICATOR_SPREAD_YAML },
] as const satisfies readonly EntityGraphTraversalScenarioDefinition[];

export type EntityGraphTraversalScenarioId =
  (typeof entityGraphTraversalScenarioDefinitions)[number]['id'];

export const listEntityGraphTraversalScenarioIds = (): string[] =>
  entityGraphTraversalScenarioDefinitions.map((definition) => definition.id);

/**
 * Parse and validate a scenario's YAML. Throws a `ZodError` when the file does not match the
 * schema, so a malformed scenario fails loudly at load time rather than mid-traversal.
 */
export const parseEntityGraphTraversalScenario = (yaml: string): EntityGraphTraversalScenario =>
  entityGraphTraversalScenarioSchema.parse(parse(yaml));

export const getEntityGraphTraversalScenario = (
  id: string
): EntityGraphTraversalScenario | undefined => {
  const definition = entityGraphTraversalScenarioDefinitions.find((d) => d.id === id);
  if (!definition) return undefined;
  const scenario = parseEntityGraphTraversalScenario(definition.yaml);
  if (scenario.id !== id) {
    throw new Error(
      `Entity graph traversal scenario "${id}" declares a different id in its YAML ("${scenario.id}")`
    );
  }
  return scenario;
};

/**
 * Load a scenario by id and build the executable plan for a run.
 */
export const loadEntityGraphTraversalPlan = (
  id: string,
  overrides?: EntityGraphTraversalLimitOverrides
): EntityGraphTraversalPlan | undefined => {
  const scenario = getEntityGraphTraversalScenario(id);
  return scenario ? buildEntityGraphTraversalPlan(scenario, overrides) : undefined;
};
