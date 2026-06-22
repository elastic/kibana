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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Run a policy.
 *
 * Immediately create a snapshot according to the snapshot lifecycle policy without waiting for the scheduled time.
 * The snapshot policy is normally applied according to its schedule, but you might want to manually run a policy before performing an upgrade or other maintenance.
 */
export const SlmExecuteLifecycleRequest = z.object({
  ...RequestBase.shape,
  policy_id: Name.describe('The id of the snapshot lifecycle policy to be executed').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmExecuteLifecycleRequest' })
export type SlmExecuteLifecycleRequest = z.infer<typeof SlmExecuteLifecycleRequest>

export const SlmExecuteLifecycleResponse = z.object({
  snapshot_name: Name
}).meta({ id: 'SlmExecuteLifecycleResponse' })
export type SlmExecuteLifecycleResponse = z.infer<typeof SlmExecuteLifecycleResponse>
