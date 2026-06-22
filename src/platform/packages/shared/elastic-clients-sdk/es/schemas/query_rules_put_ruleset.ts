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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const QueryDslPinnedDoc = z.object({
  _id: Id.describe('The unique document ID.'),
  _index: IndexName.describe('The index that contains the document.').optional()
}).meta({ id: 'QueryDslPinnedDoc' })
export type QueryDslPinnedDoc = z.infer<typeof QueryDslPinnedDoc>

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
