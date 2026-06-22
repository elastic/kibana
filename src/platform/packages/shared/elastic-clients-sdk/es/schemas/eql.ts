/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchTotalHits } from './_global.search'
import { AcknowledgedResponseBase, Duration, DurationValue, EpochTime, ExpandWildcards, Field, Id, IndexName, Indices, RequestBase, ShardFailure, integer, uint } from './_types'
import { MappingRuntimeFields } from './_types.mapping'
import { QueryDslFieldAndFormat, QueryDslQueryContainer } from './_types.query_dsl'

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
 * Delete an async EQL search.
 *
 * Delete an async EQL search or a stored synchronous EQL search.
 * The API also deletes results for the search.
 */
export const EqlDeleteRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the search to delete. A search ID is provided in the EQL search API\'s response for an async search. A search ID is also provided if the request’s `keep_on_completion` parameter is `true`.').meta({ found_in: 'path' })
}).meta({ id: 'EqlDeleteRequest' })
export type EqlDeleteRequest = z.infer<typeof EqlDeleteRequest>

export const EqlDeleteResponse = AcknowledgedResponseBase.meta({ id: 'EqlDeleteResponse' })
export type EqlDeleteResponse = z.infer<typeof EqlDeleteResponse>

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

/**
 * Get the async EQL status.
 *
 * Get the current status for an async EQL search or a stored synchronous EQL search without returning results.
 */
export const EqlGetStatusRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the search.').meta({ found_in: 'path' })
}).meta({ id: 'EqlGetStatusRequest' })
export type EqlGetStatusRequest = z.infer<typeof EqlGetStatusRequest>

export const EqlGetStatusResponse = z.object({
  id: Id.describe('Identifier for the search.'),
  is_partial: z.boolean().describe('If true, the search request is still executing. If false, the search is completed.'),
  is_running: z.boolean().describe('If true, the response does not contain complete search results. This could be because either the search is still running (is_running status is false), or because it is already completed (is_running status is true) and results are partial due to failures or timeouts.'),
  start_time_in_millis: EpochTime.describe('For a running search shows a timestamp when the eql search started, in milliseconds since the Unix epoch.').optional(),
  expiration_time_in_millis: EpochTime.describe('Shows a timestamp when the eql search will be expired, in milliseconds since the Unix epoch. When this time is reached, the search and its results are deleted, even if the search is still ongoing.').optional(),
  completion_status: integer.describe('For a completed search shows the http status code of the completed search.').optional()
}).meta({ id: 'EqlGetStatusResponse' })
export type EqlGetStatusResponse = z.infer<typeof EqlGetStatusResponse>

export const EqlSearchResultPosition = z.enum(['tail', 'head']).meta({ id: 'EqlSearchResultPosition' })
export type EqlSearchResultPosition = z.infer<typeof EqlSearchResultPosition>

/**
 * Get EQL search results.
 *
 * Returns search results for an Event Query Language (EQL) query.
 * EQL assumes each document in a data stream or index corresponds to an event.
 */
export const EqlSearchRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of index names to scope the operation').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Whether to expand wildcard expression to concrete indices that are open, closed or both.').optional().meta({ found_in: 'query' }),
  ccs_minimize_roundtrips: z.boolean().describe('Indicates whether network round-trips should be minimized as part of cross-cluster search requests execution').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  query: z.string().describe('EQL query you wish to run.').meta({ found_in: 'body' }),
  case_sensitive: z.boolean().optional().meta({ found_in: 'body' }),
  event_category_field: Field.describe('Field containing the event classification, such as process, file, or network.').optional().meta({ found_in: 'body' }),
  tiebreaker_field: Field.describe('Field used to sort hits with the same timestamp in ascending order').optional().meta({ found_in: 'body' }),
  timestamp_field: Field.describe('Field containing event timestamp.').optional().meta({ found_in: 'body' }),
  fetch_size: uint.describe('Maximum number of events to search at a time for sequence queries.').optional().meta({ found_in: 'body' }),
  filter: z.union([z.lazy(() => QueryDslQueryContainer), z.array(z.lazy(() => QueryDslQueryContainer))]).describe('Query, written in Query DSL, used to filter the events on which the EQL query runs.').optional().meta({ found_in: 'body' }),
  keep_alive: Duration.optional().meta({ found_in: 'body' }),
  keep_on_completion: z.boolean().optional().meta({ found_in: 'body' }),
  wait_for_completion_timeout: Duration.optional().meta({ found_in: 'body' }),
  allow_partial_search_results: z.boolean().describe('Allow query execution also in case of shard failures. If true, the query will keep running and will return results based on the available shards. For sequences, the behavior can be further refined using allow_partial_sequence_results').optional().meta({ found_in: 'body' }),
  allow_partial_sequence_results: z.boolean().describe('This flag applies only to sequences and has effect only if allow_partial_search_results=true. If true, the sequence query will return results based on the available shards, ignoring the others. If false, the sequence query will return successfully, but will always have empty results.').optional().meta({ found_in: 'body' }),
  size: uint.describe('For basic queries, the maximum number of matching events to return. Defaults to 10').optional().meta({ found_in: 'body' }),
  fields: z.union([z.lazy(() => QueryDslFieldAndFormat), z.array(z.lazy(() => QueryDslFieldAndFormat))]).describe('Array of wildcard (*) patterns. The response returns values for field names matching these patterns in the fields property of each hit.').optional().meta({ found_in: 'body' }),
  result_position: EqlSearchResultPosition.optional().meta({ found_in: 'body' }),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).optional().meta({ found_in: 'body' }),
  max_samples_per_key: integer.describe('By default, the response of a sample query contains up to `10` samples, with one sample per unique set of join keys. Use the `size` parameter to get a smaller or larger set of samples. To retrieve more than one sample per set of join keys, use the `max_samples_per_key` parameter. Pipes are not supported for sample queries.').optional().meta({ found_in: 'body' })
}).meta({ id: 'EqlSearchRequest' })
export type EqlSearchRequest = z.infer<typeof EqlSearchRequest>

export const EqlSearchResponse = EqlEqlSearchResponseBase.meta({ id: 'EqlSearchResponse' })
export type EqlSearchResponse = z.infer<typeof EqlSearchResponse>
