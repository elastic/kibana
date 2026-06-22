/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Id, RequestBase, Result, integer } from './_types'
import { IndicesReloadSearchAnalyzersReloadResult } from './indices'

export const SynonymsSynonymString = z.string().meta({ id: 'SynonymsSynonymString' })
export type SynonymsSynonymString = z.infer<typeof SynonymsSynonymString>

export const SynonymsSynonymRule = z.object({
  id: Id.describe('The identifier for the synonym rule. If you do not specify a synonym rule ID when you create a rule, an identifier is created automatically by Elasticsearch.').optional(),
  synonyms: SynonymsSynonymString.describe('The synonyms that conform the synonym rule in Solr format.')
}).meta({ id: 'SynonymsSynonymRule' })
export type SynonymsSynonymRule = z.infer<typeof SynonymsSynonymRule>

export const SynonymsSynonymRuleRead = z.object({
  id: Id.describe('The identifier for the synonym rule. If you do not specify a synonym rule ID when you create a rule, an identifier is created automatically by Elasticsearch.'),
  synonyms: SynonymsSynonymString.describe('The synonyms that conform the synonym rule in Solr format.')
}).meta({ id: 'SynonymsSynonymRuleRead' })
export type SynonymsSynonymRuleRead = z.infer<typeof SynonymsSynonymRuleRead>

export const SynonymsSynonymsUpdateResult = z.object({
  result: Result.describe('The update operation result.'),
  reload_analyzers_details: IndicesReloadSearchAnalyzersReloadResult.describe('Updating synonyms in a synonym set can reload the associated analyzers in case refresh is set to true. This information is the analyzers reloading result.').optional()
}).meta({ id: 'SynonymsSynonymsUpdateResult' })
export type SynonymsSynonymsUpdateResult = z.infer<typeof SynonymsSynonymsUpdateResult>

/**
 * Delete a synonym set.
 *
 * You can only delete a synonyms set that is not in use by any index analyzer.
 *
 * Synonyms sets can be used in synonym graph token filters and synonym token filters.
 * These synonym filters can be used as part of search analyzers.
 *
 * Analyzers need to be loaded when an index is restored (such as when a node starts, or the index becomes open).
 * Even if the analyzer is not used on any field mapping, it still needs to be loaded on the index recovery phase.
 *
 * If any analyzers cannot be loaded, the index becomes unavailable and the cluster status becomes red or yellow as index shards are not available.
 * To prevent that, synonyms sets that are used in analyzers can't be deleted.
 * A delete request in this case will return a 400 response code.
 *
 * To remove a synonyms set, you must first remove all indices that contain analyzers using it.
 * You can migrate an index by creating a new index that does not contain the token filter with the synonyms set, and use the reindex API in order to copy over the index data.
 * Once finished, you can delete the index.
 * When the synonyms set is not used in analyzers, you will be able to delete it.
 */
export const SynonymsDeleteSynonymRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The synonyms set identifier to delete.').meta({ found_in: 'path' })
}).meta({ id: 'SynonymsDeleteSynonymRequest' })
export type SynonymsDeleteSynonymRequest = z.infer<typeof SynonymsDeleteSynonymRequest>

export const SynonymsDeleteSynonymResponse = AcknowledgedResponseBase.meta({ id: 'SynonymsDeleteSynonymResponse' })
export type SynonymsDeleteSynonymResponse = z.infer<typeof SynonymsDeleteSynonymResponse>

/**
 * Delete a synonym rule.
 *
 * Delete a synonym rule from a synonym set.
 */
export const SynonymsDeleteSynonymRuleRequest = z.object({
  ...RequestBase.shape,
  set_id: Id.describe('The ID of the synonym set to update.').meta({ found_in: 'path' }),
  rule_id: Id.describe('The ID of the synonym rule to delete.').meta({ found_in: 'path' })
}).meta({ id: 'SynonymsDeleteSynonymRuleRequest' })
export type SynonymsDeleteSynonymRuleRequest = z.infer<typeof SynonymsDeleteSynonymRuleRequest>

export const SynonymsDeleteSynonymRuleResponse = SynonymsSynonymsUpdateResult.meta({ id: 'SynonymsDeleteSynonymRuleResponse' })
export type SynonymsDeleteSynonymRuleResponse = z.infer<typeof SynonymsDeleteSynonymRuleResponse>

/** Get a synonym set. */
export const SynonymsGetSynonymRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The synonyms set identifier to retrieve.').meta({ found_in: 'path' }),
  from: integer.describe('The starting offset for query rules to retrieve.').optional().meta({ found_in: 'query' }),
  size: integer.describe('The max number of query rules to retrieve.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SynonymsGetSynonymRequest' })
export type SynonymsGetSynonymRequest = z.infer<typeof SynonymsGetSynonymRequest>

export const SynonymsGetSynonymResponse = z.object({
  count: integer.describe('The total number of synonyms rules that the synonyms set contains.'),
  synonyms_set: z.array(SynonymsSynonymRuleRead).describe('Synonym rule details.')
}).meta({ id: 'SynonymsGetSynonymResponse' })
export type SynonymsGetSynonymResponse = z.infer<typeof SynonymsGetSynonymResponse>

/**
 * Get a synonym rule.
 *
 * Get a synonym rule from a synonym set.
 */
export const SynonymsGetSynonymRuleRequest = z.object({
  ...RequestBase.shape,
  set_id: Id.describe('The ID of the synonym set to retrieve the synonym rule from.').meta({ found_in: 'path' }),
  rule_id: Id.describe('The ID of the synonym rule to retrieve.').meta({ found_in: 'path' })
}).meta({ id: 'SynonymsGetSynonymRuleRequest' })
export type SynonymsGetSynonymRuleRequest = z.infer<typeof SynonymsGetSynonymRuleRequest>

export const SynonymsGetSynonymRuleResponse = SynonymsSynonymRuleRead.meta({ id: 'SynonymsGetSynonymRuleResponse' })
export type SynonymsGetSynonymRuleResponse = z.infer<typeof SynonymsGetSynonymRuleResponse>

/**
 * Get all synonym sets.
 *
 * Get a summary of all defined synonym sets.
 */
export const SynonymsGetSynonymsSetsRequest = z.object({
  ...RequestBase.shape,
  from: integer.describe('The starting offset for synonyms sets to retrieve.').optional().meta({ found_in: 'query' }),
  size: integer.describe('The maximum number of synonyms sets to retrieve.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SynonymsGetSynonymsSetsRequest' })
export type SynonymsGetSynonymsSetsRequest = z.infer<typeof SynonymsGetSynonymsSetsRequest>

export const SynonymsGetSynonymsSetsSynonymsSetItem = z.object({
  synonyms_set: Id.describe('Synonyms set identifier'),
  count: integer.describe('Number of synonym rules that the synonym set contains')
}).meta({ id: 'SynonymsGetSynonymsSetsSynonymsSetItem' })
export type SynonymsGetSynonymsSetsSynonymsSetItem = z.infer<typeof SynonymsGetSynonymsSetsSynonymsSetItem>

export const SynonymsGetSynonymsSetsResponse = z.object({
  count: integer.describe('The total number of synonyms sets defined.'),
  results: z.array(SynonymsGetSynonymsSetsSynonymsSetItem).describe('The identifier and total number of defined synonym rules for each synonyms set.')
}).meta({ id: 'SynonymsGetSynonymsSetsResponse' })
export type SynonymsGetSynonymsSetsResponse = z.infer<typeof SynonymsGetSynonymsSetsResponse>

/**
 * Create or update a synonym set.
 *
 * Synonyms sets are limited to a maximum of 10,000 synonym rules per set.
 *
 * When an existing synonyms set is updated, the search analyzers that use the synonyms set are reloaded automatically for all indices.
 * This is equivalent to invoking the reload search analyzers API for all indices that use the synonyms set.
 *
 * For practical examples of how to create or update a synonyms set, refer to the External documentation.
 */
export const SynonymsPutSynonymRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The ID of the synonyms set to be created or updated.').meta({ found_in: 'path' }),
  synonyms_set: z.union([SynonymsSynonymRule, z.array(SynonymsSynonymRule)]).describe('The synonym rules definitions for the synonyms set.').meta({ found_in: 'body' })
}).meta({ id: 'SynonymsPutSynonymRequest' })
export type SynonymsPutSynonymRequest = z.infer<typeof SynonymsPutSynonymRequest>

export const SynonymsPutSynonymResponse = z.object({
  result: Result.describe('The update operation result.'),
  reload_analyzers_details: IndicesReloadSearchAnalyzersReloadResult.describe('Updating a synonyms set can reload the associated analyzers in case refresh is set to true. This information is the analyzers reloading result.').optional()
}).meta({ id: 'SynonymsPutSynonymResponse' })
export type SynonymsPutSynonymResponse = z.infer<typeof SynonymsPutSynonymResponse>

/**
 * Create or update a synonym rule.
 *
 * Create or update a synonym rule in a synonym set.
 *
 * If any of the synonym rules included is invalid, the API returns an error.
 *
 * When you update a synonym rule, all analyzers using the synonyms set will be reloaded automatically to reflect the new rule.
 */
export const SynonymsPutSynonymRuleRequest = z.object({
  ...RequestBase.shape,
  set_id: Id.describe('The ID of the synonym set.').meta({ found_in: 'path' }),
  rule_id: Id.describe('The ID of the synonym rule to be updated or created.').meta({ found_in: 'path' }),
  synonyms: SynonymsSynonymString.describe('The synonym rule information definition, which must be in Solr format.').meta({ found_in: 'body' })
}).meta({ id: 'SynonymsPutSynonymRuleRequest' })
export type SynonymsPutSynonymRuleRequest = z.infer<typeof SynonymsPutSynonymRuleRequest>

export const SynonymsPutSynonymRuleResponse = SynonymsSynonymsUpdateResult.meta({ id: 'SynonymsPutSynonymRuleResponse' })
export type SynonymsPutSynonymRuleResponse = z.infer<typeof SynonymsPutSynonymRuleResponse>
