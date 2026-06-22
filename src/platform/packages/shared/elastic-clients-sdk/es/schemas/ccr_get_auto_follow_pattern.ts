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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const IndexPattern = z.string().meta({ id: 'IndexPattern' })
export type IndexPattern = z.infer<typeof IndexPattern>

export const IndexPatterns = z.array(IndexPattern).meta({ id: 'IndexPatterns' })
export type IndexPatterns = z.infer<typeof IndexPatterns>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const CcrGetAutoFollowPatternAutoFollowPatternSummary = z.object({
  active: z.boolean(),
  remote_cluster: z.string().describe('The remote cluster containing the leader indices to match against.'),
  follow_index_pattern: IndexPattern.describe('The name of follower index.').optional(),
  leader_index_patterns: IndexPatterns.describe('An array of simple index patterns to match against indices in the remote cluster specified by the remote_cluster field.'),
  leader_index_exclusion_patterns: IndexPatterns.describe('An array of simple index patterns that can be used to exclude indices from being auto-followed.'),
  max_outstanding_read_requests: integer.describe('The maximum number of outstanding reads requests from the remote cluster.')
}).meta({ id: 'CcrGetAutoFollowPatternAutoFollowPatternSummary' })
export type CcrGetAutoFollowPatternAutoFollowPatternSummary = z.infer<typeof CcrGetAutoFollowPatternAutoFollowPatternSummary>

export const CcrGetAutoFollowPatternAutoFollowPattern = z.object({
  name: Name,
  pattern: CcrGetAutoFollowPatternAutoFollowPatternSummary
}).meta({ id: 'CcrGetAutoFollowPatternAutoFollowPattern' })
export type CcrGetAutoFollowPatternAutoFollowPattern = z.infer<typeof CcrGetAutoFollowPatternAutoFollowPattern>

/**
 * Get auto-follow patterns.
 *
 * Get cross-cluster replication auto-follow patterns.
 */
export const CcrGetAutoFollowPatternRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The auto-follow pattern collection that you want to retrieve. If you do not specify a name, the API returns information for all collections.').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrGetAutoFollowPatternRequest' })
export type CcrGetAutoFollowPatternRequest = z.infer<typeof CcrGetAutoFollowPatternRequest>

export const CcrGetAutoFollowPatternResponse = z.object({
  patterns: z.array(CcrGetAutoFollowPatternAutoFollowPattern)
}).meta({ id: 'CcrGetAutoFollowPatternResponse' })
export type CcrGetAutoFollowPatternResponse = z.infer<typeof CcrGetAutoFollowPatternResponse>
