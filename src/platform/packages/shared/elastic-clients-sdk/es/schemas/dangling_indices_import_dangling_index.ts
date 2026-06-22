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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

/**
 * Import a dangling index.
 *
 * If Elasticsearch encounters index data that is absent from the current cluster state, those indices are considered to be dangling.
 * For example, this can happen if you delete more than `cluster.indices.tombstones.size` indices while an Elasticsearch node is offline.
 */
export const DanglingIndicesImportDanglingIndexRequest = z.object({
  ...RequestBase.shape,
  index_uuid: Uuid.describe('The UUID of the index to import. Use the get dangling indices API to locate the UUID.').meta({ found_in: 'path' }),
  accept_data_loss: z.boolean().describe('This parameter must be set to true to import a dangling index. Because Elasticsearch cannot know where the dangling index data came from or determine which shard copies are fresh and which are stale, it cannot guarantee that the imported data represents the latest state of the index when it was last in the cluster.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'DanglingIndicesImportDanglingIndexRequest' })
export type DanglingIndicesImportDanglingIndexRequest = z.infer<typeof DanglingIndicesImportDanglingIndexRequest>

export const DanglingIndicesImportDanglingIndexResponse = AcknowledgedResponseBase.meta({ id: 'DanglingIndicesImportDanglingIndexResponse' })
export type DanglingIndicesImportDanglingIndexResponse = z.infer<typeof DanglingIndicesImportDanglingIndexResponse>
