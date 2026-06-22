/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Duration, DurationValue, Field, Fields, Id, Indices, Name, Names, RequestBase, TaskId, integer, long } from './_types'
import { QueryDslQueryContainer } from './_types.query_dsl'
import { TasksTaskInfo } from './tasks'

export const EnrichPolicy = z.object({
  enrich_fields: Fields,
  indices: Indices,
  match_field: Field,
  query: z.lazy(() => QueryDslQueryContainer).optional(),
  name: Name.optional(),
  elasticsearch_version: z.string().optional()
}).meta({ id: 'EnrichPolicy' })
export type EnrichPolicy = z.infer<typeof EnrichPolicy>

export const EnrichPolicyType = z.enum(['geo_match', 'match', 'range']).meta({ id: 'EnrichPolicyType' })
export type EnrichPolicyType = z.infer<typeof EnrichPolicyType>

export const EnrichSummary = z.object({
  config: z.record(EnrichPolicyType, EnrichPolicy)
}).meta({ id: 'EnrichSummary' })
export type EnrichSummary = z.infer<typeof EnrichSummary>

/**
 * Delete an enrich policy.
 *
 * Deletes an existing enrich policy and its enrich index.
 */
export const EnrichDeletePolicyRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Enrich policy to delete.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'EnrichDeletePolicyRequest' })
export type EnrichDeletePolicyRequest = z.infer<typeof EnrichDeletePolicyRequest>

export const EnrichDeletePolicyResponse = AcknowledgedResponseBase.meta({ id: 'EnrichDeletePolicyResponse' })
export type EnrichDeletePolicyResponse = z.infer<typeof EnrichDeletePolicyResponse>

export const EnrichExecutePolicyEnrichPolicyPhase = z.enum(['SCHEDULED', 'RUNNING', 'COMPLETE', 'FAILED', 'CANCELLED']).meta({ id: 'EnrichExecutePolicyEnrichPolicyPhase' })
export type EnrichExecutePolicyEnrichPolicyPhase = z.infer<typeof EnrichExecutePolicyEnrichPolicyPhase>

export const EnrichExecutePolicyExecuteEnrichPolicyStatus = z.object({
  phase: EnrichExecutePolicyEnrichPolicyPhase,
  step: z.string().optional()
}).meta({ id: 'EnrichExecutePolicyExecuteEnrichPolicyStatus' })
export type EnrichExecutePolicyExecuteEnrichPolicyStatus = z.infer<typeof EnrichExecutePolicyExecuteEnrichPolicyStatus>

/**
 * Run an enrich policy.
 *
 * Create the enrich index for an existing enrich policy.
 */
export const EnrichExecutePolicyRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Enrich policy to execute.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request blocks other enrich policy execution requests until complete.').optional().meta({ found_in: 'query' })
}).meta({ id: 'EnrichExecutePolicyRequest' })
export type EnrichExecutePolicyRequest = z.infer<typeof EnrichExecutePolicyRequest>

export const EnrichExecutePolicyResponse = z.object({
  status: EnrichExecutePolicyExecuteEnrichPolicyStatus.optional(),
  task: TaskId.optional()
}).meta({ id: 'EnrichExecutePolicyResponse' })
export type EnrichExecutePolicyResponse = z.infer<typeof EnrichExecutePolicyResponse>

/**
 * Get an enrich policy.
 *
 * Returns information about an enrich policy.
 */
export const EnrichGetPolicyRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated list of enrich policy names used to limit the request. To return information for all enrich policies, omit this parameter.').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'EnrichGetPolicyRequest' })
export type EnrichGetPolicyRequest = z.infer<typeof EnrichGetPolicyRequest>

export const EnrichGetPolicyResponse = z.object({
  policies: z.array(EnrichSummary)
}).meta({ id: 'EnrichGetPolicyResponse' })
export type EnrichGetPolicyResponse = z.infer<typeof EnrichGetPolicyResponse>

/**
 * Create an enrich policy.
 *
 * Creates an enrich policy.
 */
export const EnrichPutPolicyRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of the enrich policy to create or update.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  geo_match: EnrichPolicy.describe('Matches enrich data to incoming documents based on a `geo_shape` query.').optional().meta({ found_in: 'body' }),
  match: EnrichPolicy.describe('Matches enrich data to incoming documents based on a `term` query.').optional().meta({ found_in: 'body' }),
  range: EnrichPolicy.describe('Matches a number, date, or IP address in incoming documents to a range in the enrich index based on a `term` query.').optional().meta({ found_in: 'body' })
}).meta({ id: 'EnrichPutPolicyRequest' })
export type EnrichPutPolicyRequest = z.infer<typeof EnrichPutPolicyRequest>

export const EnrichPutPolicyResponse = AcknowledgedResponseBase.meta({ id: 'EnrichPutPolicyResponse' })
export type EnrichPutPolicyResponse = z.infer<typeof EnrichPutPolicyResponse>

export const EnrichStatsCacheStats = z.object({
  node_id: Id,
  count: integer,
  hits: integer,
  hits_time_in_millis: DurationValue,
  misses: integer,
  misses_time_in_millis: DurationValue,
  evictions: integer,
  size_in_bytes: long
}).meta({ id: 'EnrichStatsCacheStats' })
export type EnrichStatsCacheStats = z.infer<typeof EnrichStatsCacheStats>

export const EnrichStatsCoordinatorStats = z.object({
  executed_searches_total: long,
  node_id: Id,
  queue_size: integer,
  remote_requests_current: integer,
  remote_requests_total: long
}).meta({ id: 'EnrichStatsCoordinatorStats' })
export type EnrichStatsCoordinatorStats = z.infer<typeof EnrichStatsCoordinatorStats>

export const EnrichStatsExecutingPolicy = z.object({
  name: Name,
  task: TasksTaskInfo
}).meta({ id: 'EnrichStatsExecutingPolicy' })
export type EnrichStatsExecutingPolicy = z.infer<typeof EnrichStatsExecutingPolicy>

/**
 * Get enrich stats.
 *
 * Returns enrich coordinator statistics and information about enrich policies that are currently executing.
 */
export const EnrichStatsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'EnrichStatsRequest' })
export type EnrichStatsRequest = z.infer<typeof EnrichStatsRequest>

export const EnrichStatsResponse = z.object({
  coordinator_stats: z.array(EnrichStatsCoordinatorStats).describe('Objects containing information about each coordinating ingest node for configured enrich processors.'),
  executing_policies: z.array(EnrichStatsExecutingPolicy).describe('Objects containing information about each enrich policy that is currently executing.'),
  cache_stats: z.array(EnrichStatsCacheStats).describe('Objects containing information about the enrich cache stats on each ingest node.').optional()
}).meta({ id: 'EnrichStatsResponse' })
export type EnrichStatsResponse = z.infer<typeof EnrichStatsResponse>
