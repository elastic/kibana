/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const QueryRulesListRulesetsQueryRulesetListItem = z.object({
  ruleset_id: Id.describe('A unique identifier for the ruleset.'),
  rule_total_count: integer.describe('The number of rules associated with the ruleset.'),
  rule_criteria_types_counts: z.record(z.string(), integer).describe('A map of criteria type (for example, `exact`) to the number of rules of that type. NOTE: The counts in `rule_criteria_types_counts` may be larger than the value of `rule_total_count` because a rule may have multiple criteria.'),
  rule_type_counts: z.record(z.string(), integer).describe('A map of rule type (for example, `pinned`) to the number of rules of that type.')
}).meta({ id: 'QueryRulesListRulesetsQueryRulesetListItem' })
export type QueryRulesListRulesetsQueryRulesetListItem = z.infer<typeof QueryRulesListRulesetsQueryRulesetListItem>

/**
 * Get all query rulesets.
 *
 * Get summarized information about the query rulesets.
 */
export const QueryRulesListRulesetsRequest = z.object({
  ...RequestBase.shape,
  from: integer.describe('The offset from the first result to fetch.').optional().meta({ found_in: 'query' }),
  size: integer.describe('The maximum number of results to retrieve.').optional().meta({ found_in: 'query' })
}).meta({ id: 'QueryRulesListRulesetsRequest' })
export type QueryRulesListRulesetsRequest = z.infer<typeof QueryRulesListRulesetsRequest>

export const QueryRulesListRulesetsResponse = z.object({
  count: long,
  results: z.array(QueryRulesListRulesetsQueryRulesetListItem)
}).meta({ id: 'QueryRulesListRulesetsResponse' })
export type QueryRulesListRulesetsResponse = z.infer<typeof QueryRulesListRulesetsResponse>
