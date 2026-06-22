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

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

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

export const ShardFailure = z.object({
  index: IndexName.optional(),
  _index: IndexName.optional(),
  node: z.string().optional(),
  _node: z.string().optional(),
  reason: z.lazy(() => ErrorCause),
  shard: integer.optional(),
  _shard: integer.optional(),
  status: z.string().optional(),
  primary: z.boolean().optional()
}).meta({ id: 'ShardFailure' })
export type ShardFailure = z.infer<typeof ShardFailure>

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

export const ShardStatistics = z.object({
  failed: uint.describe('The number of shards the operation or search attempted to run on but failed.'),
  successful: uint.describe('The number of shards the operation or search succeeded on.'),
  total: uint.describe('The number of shards the operation or search will run on overall.'),
  failures: z.array(ShardFailure).optional(),
  skipped: uint.optional()
}).meta({ id: 'ShardStatistics' })
export type ShardStatistics = z.infer<typeof ShardStatistics>

export const IndicesReloadSearchAnalyzersReloadDetails = z.object({
  index: z.string(),
  reloaded_analyzers: z.array(z.string()),
  reloaded_node_ids: z.array(z.string())
}).meta({ id: 'IndicesReloadSearchAnalyzersReloadDetails' })
export type IndicesReloadSearchAnalyzersReloadDetails = z.infer<typeof IndicesReloadSearchAnalyzersReloadDetails>

export const IndicesReloadSearchAnalyzersReloadResult = z.object({
  reload_details: z.array(IndicesReloadSearchAnalyzersReloadDetails),
  _shards: ShardStatistics
}).meta({ id: 'IndicesReloadSearchAnalyzersReloadResult' })
export type IndicesReloadSearchAnalyzersReloadResult = z.infer<typeof IndicesReloadSearchAnalyzersReloadResult>

export const SynonymsSynonymString = z.string().meta({ id: 'SynonymsSynonymString' })
export type SynonymsSynonymString = z.infer<typeof SynonymsSynonymString>

export const SynonymsSynonymRule = z.object({
  id: Id.describe('The identifier for the synonym rule. If you do not specify a synonym rule ID when you create a rule, an identifier is created automatically by Elasticsearch.').optional(),
  synonyms: SynonymsSynonymString.describe('The synonyms that conform the synonym rule in Solr format.')
}).meta({ id: 'SynonymsSynonymRule' })
export type SynonymsSynonymRule = z.infer<typeof SynonymsSynonymRule>

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
