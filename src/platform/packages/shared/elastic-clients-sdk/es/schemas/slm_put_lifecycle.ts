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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const SlmConfiguration = z.object({
  ignore_unavailable: z.boolean().describe('If false, the snapshot fails if any data stream or index in indices is missing or closed. If true, the snapshot ignores missing or closed data streams and indices.').optional(),
  indices: Indices.describe('A comma-separated list of data streams and indices to include in the snapshot. Multi-index syntax is supported. By default, a snapshot includes all data streams and indices in the cluster. If this argument is provided, the snapshot only includes the specified data streams and clusters.').optional(),
  include_global_state: z.boolean().describe('If true, the current global state is included in the snapshot.').optional(),
  feature_states: z.array(z.string()).describe('A list of feature states to be included in this snapshot. A list of features available for inclusion in the snapshot and their descriptions be can be retrieved using the get features API. Each feature state includes one or more system indices containing data necessary for the function of that feature. Providing an empty array will include no feature states in the snapshot, regardless of the value of include_global_state. By default, all available feature states will be included in the snapshot if include_global_state is true, or no feature states if include_global_state is false.').optional(),
  metadata: Metadata.describe('Attaches arbitrary metadata to the snapshot, such as a record of who took the snapshot, why it was taken, or any other useful data. Metadata must be less than 1024 bytes.').optional(),
  partial: z.boolean().describe('If false, the entire snapshot will fail if one or more indices included in the snapshot do not have all primary shards available.').optional()
}).meta({ id: 'SlmConfiguration' })
export type SlmConfiguration = z.infer<typeof SlmConfiguration>

export const SlmRetention = z.object({
  expire_after: Duration.describe('Time period after which a snapshot is considered expired and eligible for deletion. SLM deletes expired snapshots based on the slm.retention_schedule.'),
  max_count: integer.describe('Maximum number of snapshots to retain, even if the snapshots have not yet expired. If the number of snapshots in the repository exceeds this limit, the policy retains the most recent snapshots and deletes older snapshots.'),
  min_count: integer.describe('Minimum number of snapshots to retain, even if the snapshots have expired.')
}).meta({ id: 'SlmRetention' })
export type SlmRetention = z.infer<typeof SlmRetention>

export const WatcherCronExpression = z.string().meta({ id: 'WatcherCronExpression' })
export type WatcherCronExpression = z.infer<typeof WatcherCronExpression>

/**
 * Create or update a policy.
 *
 * Create or update a snapshot lifecycle policy.
 * If the policy already exists, this request increments the policy version.
 * Only the latest version of a policy is stored.
 */
export const SlmPutLifecycleRequest = z.object({
  ...RequestBase.shape,
  policy_id: Name.describe('The identifier for the snapshot lifecycle policy you want to create or update.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  config: SlmConfiguration.describe('Configuration for each snapshot created by the policy.').optional().meta({ found_in: 'body' }),
  name: Name.describe('Name automatically assigned to each snapshot created by the policy. Date math is supported. To prevent conflicting snapshot names, a UUID is automatically appended to each snapshot name.').optional().meta({ found_in: 'body' }),
  repository: z.string().describe('Repository used to store snapshots created by this policy. This repository must exist prior to the policy’s creation. You can create a repository using the snapshot repository API.').optional().meta({ found_in: 'body' }),
  retention: SlmRetention.describe('Retention rules used to retain and delete snapshots created by the policy.').optional().meta({ found_in: 'body' }),
  schedule: WatcherCronExpression.describe('Periodic or absolute schedule at which the policy creates snapshots. SLM applies schedule changes immediately.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SlmPutLifecycleRequest' })
export type SlmPutLifecycleRequest = z.infer<typeof SlmPutLifecycleRequest>

export const SlmPutLifecycleResponse = AcknowledgedResponseBase.meta({ id: 'SlmPutLifecycleResponse' })
export type SlmPutLifecycleResponse = z.infer<typeof SlmPutLifecycleResponse>
