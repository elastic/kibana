/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Id, RequestBase, Result, integer, long } from './_types'
import { QueryDslPinnedDoc } from './_types.query_dsl'

export const QueryRulesQueryRuleType = z.enum(['pinned', 'exclude']).meta({ id: 'QueryRulesQueryRuleType' })
export type QueryRulesQueryRuleType = z.infer<typeof QueryRulesQueryRuleType>

export const QueryRulesQueryRuleCriteriaType = z.enum(['global', 'exact', 'fuzzy', 'prefix', 'suffix', 'contains', 'lt', 'lte', 'gt', 'gte', 'always']).meta({ id: 'QueryRulesQueryRuleCriteriaType' })
export type QueryRulesQueryRuleCriteriaType = z.infer<typeof QueryRulesQueryRuleCriteriaType>

export const QueryRulesQueryRuleCriteria = z.object({
  type: QueryRulesQueryRuleCriteriaType.describe('The type of criteria. The following criteria types are supported: * `always`: Matches all queries, regardless of input. * `contains`: Matches that contain this value anywhere in the field meet the criteria defined by the rule. Only applicable for string values. * `exact`: Only exact matches meet the criteria defined by the rule. Applicable for string or numerical values. * `fuzzy`: Exact matches or matches within the allowed Levenshtein Edit Distance meet the criteria defined by the rule. Only applicable for string values. * `gt`: Matches with a value greater than this value meet the criteria defined by the rule. Only applicable for numerical values. * `gte`: Matches with a value greater than or equal to this value meet the criteria defined by the rule. Only applicable for numerical values. * `lt`: Matches with a value less than this value meet the criteria defined by the rule. Only applicable for numerical values. * `lte`: Matches with a value less than or equal to this value meet the criteria defined by the rule. Only applicable for numerical values. * `prefix`: Matches that start with this value meet the criteria defined by the rule. Only applicable for string values. * `suffix`: Matches that end with this value meet the criteria defined by the rule. Only applicable for string values.'),
  metadata: z.string().describe('The metadata field to match against. This metadata will be used to match against `match_criteria` sent in the rule. It is required for all criteria types except `always`.').optional(),
  values: z.array(z.any()).describe('The values to match against the `metadata` field. Only one value must match for the criteria to be met. It is required for all criteria types except `always`.').optional()
}).meta({ id: 'QueryRulesQueryRuleCriteria' })
export type QueryRulesQueryRuleCriteria = z.infer<typeof QueryRulesQueryRuleCriteria>

export const QueryRulesQueryRuleActions = z.object({
  ids: z.array(Id).describe('The unique document IDs of the documents to apply the rule to. Only one of `ids` or `docs` may be specified and at least one must be specified.').optional(),
  docs: z.array(QueryDslPinnedDoc).describe('The documents to apply the rule to. Only one of `ids` or `docs` may be specified and at least one must be specified. There is a maximum value of 100 documents in a rule. You can specify the following attributes for each document: * `_index`: The index of the document to pin. * `_id`: The unique document ID.').optional()
}).meta({ id: 'QueryRulesQueryRuleActions' })
export type QueryRulesQueryRuleActions = z.infer<typeof QueryRulesQueryRuleActions>

export const QueryRulesQueryRule = z.object({
  rule_id: Id.describe('A unique identifier for the rule.'),
  type: QueryRulesQueryRuleType.describe('The type of rule. `pinned` will identify and pin specific documents to the top of search results. `exclude` will exclude specific documents from search results.'),
  criteria: z.union([QueryRulesQueryRuleCriteria, z.array(QueryRulesQueryRuleCriteria)]).describe('The criteria that must be met for the rule to be applied. If multiple criteria are specified for a rule, all criteria must be met for the rule to be applied.'),
  actions: QueryRulesQueryRuleActions.describe('The actions to take when the rule is matched. The format of this action depends on the rule type.'),
  priority: integer.optional()
}).meta({ id: 'QueryRulesQueryRule' })
export type QueryRulesQueryRule = z.infer<typeof QueryRulesQueryRule>

export const QueryRulesQueryRuleset = z.object({
  ruleset_id: Id.describe('A unique identifier for the ruleset.'),
  rules: z.array(QueryRulesQueryRule).describe('Rules associated with the query ruleset.')
}).meta({ id: 'QueryRulesQueryRuleset' })
export type QueryRulesQueryRuleset = z.infer<typeof QueryRulesQueryRuleset>

/**
 * Delete a query rule.
 *
 * Delete a query rule within a query ruleset.
 * This is a destructive action that is only recoverable by re-adding the same rule with the create or update query rule API.
 */
export const QueryRulesDeleteRuleRequest = z.object({
  ...RequestBase.shape,
  ruleset_id: Id.describe('The unique identifier of the query ruleset containing the rule to delete').meta({ found_in: 'path' }),
  rule_id: Id.describe('The unique identifier of the query rule within the specified ruleset to delete').meta({ found_in: 'path' })
}).meta({ id: 'QueryRulesDeleteRuleRequest' })
export type QueryRulesDeleteRuleRequest = z.infer<typeof QueryRulesDeleteRuleRequest>

export const QueryRulesDeleteRuleResponse = AcknowledgedResponseBase.meta({ id: 'QueryRulesDeleteRuleResponse' })
export type QueryRulesDeleteRuleResponse = z.infer<typeof QueryRulesDeleteRuleResponse>

/**
 * Delete a query ruleset.
 *
 * Remove a query ruleset and its associated data.
 * This is a destructive action that is not recoverable.
 */
export const QueryRulesDeleteRulesetRequest = z.object({
  ...RequestBase.shape,
  ruleset_id: Id.describe('The unique identifier of the query ruleset to delete').meta({ found_in: 'path' })
}).meta({ id: 'QueryRulesDeleteRulesetRequest' })
export type QueryRulesDeleteRulesetRequest = z.infer<typeof QueryRulesDeleteRulesetRequest>

export const QueryRulesDeleteRulesetResponse = AcknowledgedResponseBase.meta({ id: 'QueryRulesDeleteRulesetResponse' })
export type QueryRulesDeleteRulesetResponse = z.infer<typeof QueryRulesDeleteRulesetResponse>

/**
 * Get a query rule.
 *
 * Get details about a query rule within a query ruleset.
 */
export const QueryRulesGetRuleRequest = z.object({
  ...RequestBase.shape,
  ruleset_id: Id.describe('The unique identifier of the query ruleset containing the rule to retrieve').meta({ found_in: 'path' }),
  rule_id: Id.describe('The unique identifier of the query rule within the specified ruleset to retrieve').meta({ found_in: 'path' })
}).meta({ id: 'QueryRulesGetRuleRequest' })
export type QueryRulesGetRuleRequest = z.infer<typeof QueryRulesGetRuleRequest>

export const QueryRulesGetRuleResponse = QueryRulesQueryRule.meta({ id: 'QueryRulesGetRuleResponse' })
export type QueryRulesGetRuleResponse = z.infer<typeof QueryRulesGetRuleResponse>

/**
 * Get a query ruleset.
 *
 * Get details about a query ruleset.
 */
export const QueryRulesGetRulesetRequest = z.object({
  ...RequestBase.shape,
  ruleset_id: Id.describe('The unique identifier of the query ruleset').meta({ found_in: 'path' })
}).meta({ id: 'QueryRulesGetRulesetRequest' })
export type QueryRulesGetRulesetRequest = z.infer<typeof QueryRulesGetRulesetRequest>

export const QueryRulesGetRulesetResponse = QueryRulesQueryRuleset.meta({ id: 'QueryRulesGetRulesetResponse' })
export type QueryRulesGetRulesetResponse = z.infer<typeof QueryRulesGetRulesetResponse>

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

/**
 * Create or update a query rule.
 *
 * Create or update a query rule within a query ruleset.
 *
 * IMPORTANT: Due to limitations within pinned queries, you can only pin documents using ids or docs, but cannot use both in single rule.
 * It is advised to use one or the other in query rulesets, to avoid errors.
 * Additionally, pinned queries have a maximum limit of 100 pinned hits.
 * If multiple matching rules pin more than 100 documents, only the first 100 documents are pinned in the order they are specified in the ruleset.
 */
export const QueryRulesPutRuleRequest = z.object({
  ...RequestBase.shape,
  ruleset_id: Id.describe('The unique identifier of the query ruleset containing the rule to be created or updated.').meta({ found_in: 'path' }),
  rule_id: Id.describe('The unique identifier of the query rule within the specified ruleset to be created or updated.').meta({ found_in: 'path' }),
  type: QueryRulesQueryRuleType.describe('The type of rule.').meta({ found_in: 'body' }),
  criteria: z.union([QueryRulesQueryRuleCriteria, z.array(QueryRulesQueryRuleCriteria)]).describe('The criteria that must be met for the rule to be applied. If multiple criteria are specified for a rule, all criteria must be met for the rule to be applied.').meta({ found_in: 'body' }),
  actions: QueryRulesQueryRuleActions.describe('The actions to take when the rule is matched. The format of this action depends on the rule type.').meta({ found_in: 'body' }),
  priority: integer.optional().meta({ found_in: 'body' })
}).meta({ id: 'QueryRulesPutRuleRequest' })
export type QueryRulesPutRuleRequest = z.infer<typeof QueryRulesPutRuleRequest>

export const QueryRulesPutRuleResponse = z.object({
  result: Result
}).meta({ id: 'QueryRulesPutRuleResponse' })
export type QueryRulesPutRuleResponse = z.infer<typeof QueryRulesPutRuleResponse>

/**
 * Create or update a query ruleset.
 *
 * There is a limit of 100 rules per ruleset.
 * This limit can be increased by using the `xpack.applications.rules.max_rules_per_ruleset` cluster setting.
 *
 * IMPORTANT: Due to limitations within pinned queries, you can only select documents using `ids` or `docs`, but cannot use both in single rule.
 * It is advised to use one or the other in query rulesets, to avoid errors.
 * Additionally, pinned queries have a maximum limit of 100 pinned hits.
 * If multiple matching rules pin more than 100 documents, only the first 100 documents are pinned in the order they are specified in the ruleset.
 */
export const QueryRulesPutRulesetRequest = z.object({
  ...RequestBase.shape,
  ruleset_id: Id.describe('The unique identifier of the query ruleset to be created or updated.').meta({ found_in: 'path' }),
  rules: z.union([QueryRulesQueryRule, z.array(QueryRulesQueryRule)]).meta({ found_in: 'body' })
}).meta({ id: 'QueryRulesPutRulesetRequest' })
export type QueryRulesPutRulesetRequest = z.infer<typeof QueryRulesPutRulesetRequest>

export const QueryRulesPutRulesetResponse = z.object({
  result: Result
}).meta({ id: 'QueryRulesPutRulesetResponse' })
export type QueryRulesPutRulesetResponse = z.infer<typeof QueryRulesPutRulesetResponse>

export const QueryRulesTestQueryRulesetMatchedRule = z.object({
  ruleset_id: Id.describe('Ruleset unique identifier'),
  rule_id: Id.describe('Rule unique identifier within that ruleset')
}).meta({ id: 'QueryRulesTestQueryRulesetMatchedRule' })
export type QueryRulesTestQueryRulesetMatchedRule = z.infer<typeof QueryRulesTestQueryRulesetMatchedRule>

/**
 * Test a query ruleset.
 *
 * Evaluate match criteria against a query ruleset to identify the rules that would match that criteria.
 */
export const QueryRulesTestRequest = z.object({
  ...RequestBase.shape,
  ruleset_id: Id.describe('The unique identifier of the query ruleset to be created or updated').meta({ found_in: 'path' }),
  match_criteria: z.record(z.string(), z.any()).describe('The match criteria to apply to rules in the given query ruleset. Match criteria should match the keys defined in the `criteria.metadata` field of the rule.').meta({ found_in: 'body' })
}).meta({ id: 'QueryRulesTestRequest' })
export type QueryRulesTestRequest = z.infer<typeof QueryRulesTestRequest>

export const QueryRulesTestResponse = z.object({
  total_matched_rules: integer,
  matched_rules: z.array(QueryRulesTestQueryRulesetMatchedRule)
}).meta({ id: 'QueryRulesTestResponse' })
export type QueryRulesTestResponse = z.infer<typeof QueryRulesTestResponse>
