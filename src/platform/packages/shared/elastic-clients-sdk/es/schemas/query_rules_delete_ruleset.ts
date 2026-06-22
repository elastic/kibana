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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

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
