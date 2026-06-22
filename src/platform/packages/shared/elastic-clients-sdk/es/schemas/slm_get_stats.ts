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

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SlmSnapshotPolicyStats = z.object({
  policy: z.string(),
  snapshots_taken: long,
  snapshots_failed: long,
  snapshots_deleted: long,
  snapshot_deletion_failures: long
}).meta({ id: 'SlmSnapshotPolicyStats' })
export type SlmSnapshotPolicyStats = z.infer<typeof SlmSnapshotPolicyStats>

/**
 * Get snapshot lifecycle management statistics.
 *
 * Get global and policy-level statistics about actions taken by snapshot lifecycle management.
 */
export const SlmGetStatsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmGetStatsRequest' })
export type SlmGetStatsRequest = z.infer<typeof SlmGetStatsRequest>

export const SlmGetStatsResponse = z.object({
  retention_deletion_time: Duration,
  retention_deletion_time_millis: DurationValue,
  retention_failed: long,
  retention_runs: long,
  retention_timed_out: long,
  total_snapshots_deleted: long,
  total_snapshot_deletion_failures: long,
  total_snapshots_failed: long,
  total_snapshots_taken: long,
  policy_stats: z.array(SlmSnapshotPolicyStats)
}).meta({ id: 'SlmGetStatsResponse' })
export type SlmGetStatsResponse = z.infer<typeof SlmGetStatsResponse>
