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

export const SearchTotalHitsRelation = z.enum(['eq', 'gte']).meta({ id: 'SearchTotalHitsRelation' })
export type SearchTotalHitsRelation = z.infer<typeof SearchTotalHitsRelation>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SearchTotalHits = z.object({
  relation: SearchTotalHitsRelation,
  value: long
}).meta({ id: 'SearchTotalHits' })
export type SearchTotalHits = z.infer<typeof SearchTotalHits>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

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

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

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

export const EqlHitsEvent = z.object({
  _index: IndexName.describe('Name of the index containing the event.'),
  _id: Id.describe('Unique identifier for the event. This ID is only unique within the index.'),
  _source: z.any().describe('Original JSON body passed for the event at index time.'),
  missing: z.boolean().describe('Set to `true` for events in a timespan-constrained sequence that do not meet a given condition.').optional(),
  fields: z.record(Field, z.array(z.any())).optional()
}).meta({ id: 'EqlHitsEvent' })
export type EqlHitsEvent = z.infer<typeof EqlHitsEvent>

export const EqlHitsSequence = z.object({
  events: z.array(EqlHitsEvent).describe('Contains events matching the query. Each object represents a matching event.'),
  join_keys: z.array(z.any()).describe('Shared field values used to constrain matches in the sequence. These are defined using the by keyword in the EQL query syntax.').optional()
}).meta({ id: 'EqlHitsSequence' })
export type EqlHitsSequence = z.infer<typeof EqlHitsSequence>

export const EqlEqlHits = z.object({
  total: SearchTotalHits.describe('Metadata about the number of matching events or sequences.').optional(),
  events: z.array(EqlHitsEvent).describe('Contains events matching the query. Each object represents a matching event.').optional(),
  sequences: z.array(EqlHitsSequence).describe('Contains event sequences matching the query. Each object represents a matching sequence. This parameter is only returned for EQL queries containing a sequence.').optional()
}).meta({ id: 'EqlEqlHits' })
export type EqlEqlHits = z.infer<typeof EqlEqlHits>

export const EqlEqlSearchResponseBase = z.object({
  id: Id.describe('Identifier for the search.').optional(),
  is_partial: z.boolean().describe('If true, the response does not contain complete search results.').optional(),
  is_running: z.boolean().describe('If true, the search request is still executing.').optional(),
  took: DurationValue.describe('Milliseconds it took Elasticsearch to execute the request.').optional(),
  timed_out: z.boolean().describe('If true, the request timed out before completion.').optional(),
  hits: EqlEqlHits.describe('Contains matching events and sequences. Also contains related metadata.'),
  shard_failures: z.array(ShardFailure).describe('Contains information about shard failures (if any), in case allow_partial_search_results=true').optional()
}).meta({ id: 'EqlEqlSearchResponseBase' })
export type EqlEqlSearchResponseBase = z.infer<typeof EqlEqlSearchResponseBase>

/**
 * Get async EQL search results.
 *
 * Get the current status and available results for an async EQL search or a stored synchronous EQL search.
 */
export const EqlGetRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the search.').meta({ found_in: 'path' }),
  keep_alive: Duration.describe('Period for which the search and its results are stored on the cluster. Defaults to the keep_alive value set by the search’s EQL search API request.').optional().meta({ found_in: 'query' }),
  wait_for_completion_timeout: Duration.describe('Timeout duration to wait for the request to finish. Defaults to no timeout, meaning the request waits for complete search results.').optional().meta({ found_in: 'query' })
}).meta({ id: 'EqlGetRequest' })
export type EqlGetRequest = z.infer<typeof EqlGetRequest>

export const EqlGetResponse = EqlEqlSearchResponseBase.meta({ id: 'EqlGetResponse' })
export type EqlGetResponse = z.infer<typeof EqlGetResponse>
