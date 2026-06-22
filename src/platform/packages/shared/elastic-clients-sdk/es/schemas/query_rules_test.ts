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
