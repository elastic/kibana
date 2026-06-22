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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Pause an auto-follow pattern.
 *
 * Pause a cross-cluster replication auto-follow pattern.
 * When the API returns, the auto-follow pattern is inactive.
 * New indices that are created on the remote cluster and match the auto-follow patterns are ignored.
 *
 * You can resume auto-following with the resume auto-follow pattern API.
 * When it resumes, the auto-follow pattern is active again and automatically configures follower indices for newly created indices on the remote cluster that match its patterns.
 * Remote indices that were created while the pattern was paused will also be followed, unless they have been deleted or closed in the interim.
 */
export const CcrPauseAutoFollowPatternRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the auto-follow pattern to pause.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrPauseAutoFollowPatternRequest' })
export type CcrPauseAutoFollowPatternRequest = z.infer<typeof CcrPauseAutoFollowPatternRequest>

export const CcrPauseAutoFollowPatternResponse = AcknowledgedResponseBase.meta({ id: 'CcrPauseAutoFollowPatternResponse' })
export type CcrPauseAutoFollowPatternResponse = z.infer<typeof CcrPauseAutoFollowPatternResponse>
