/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Duration, EpochTime, Ids, RequestBase, Uuid } from './_types'

/**
 * Delete a dangling index.
 *
 * If Elasticsearch encounters index data that is absent from the current cluster state, those indices are considered to be dangling.
 * For example, this can happen if you delete more than `cluster.indices.tombstones.size` indices while an Elasticsearch node is offline.
 */
export const DanglingIndicesDeleteDanglingIndexRequest = z.object({
  ...RequestBase.shape,
  index_uuid: Uuid.describe('The UUID of the index to delete. Use the get dangling indices API to find the UUID.').meta({ found_in: 'path' }),
  accept_data_loss: z.boolean().describe('This parameter must be set to true to acknowledge that it will no longer be possible to recove data from the dangling index.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'DanglingIndicesDeleteDanglingIndexRequest' })
export type DanglingIndicesDeleteDanglingIndexRequest = z.infer<typeof DanglingIndicesDeleteDanglingIndexRequest>

export const DanglingIndicesDeleteDanglingIndexResponse = AcknowledgedResponseBase.meta({ id: 'DanglingIndicesDeleteDanglingIndexResponse' })
export type DanglingIndicesDeleteDanglingIndexResponse = z.infer<typeof DanglingIndicesDeleteDanglingIndexResponse>

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

export const DanglingIndicesListDanglingIndicesDanglingIndex = z.object({
  index_name: z.string(),
  index_uuid: z.string(),
  creation_date_millis: EpochTime,
  node_ids: Ids
}).meta({ id: 'DanglingIndicesListDanglingIndicesDanglingIndex' })
export type DanglingIndicesListDanglingIndicesDanglingIndex = z.infer<typeof DanglingIndicesListDanglingIndicesDanglingIndex>

/**
 * Get the dangling indices.
 *
 * If Elasticsearch encounters index data that is absent from the current cluster state, those indices are considered to be dangling.
 * For example, this can happen if you delete more than `cluster.indices.tombstones.size` indices while an Elasticsearch node is offline.
 *
 * Use this API to list dangling indices, which you can then import or delete.
 */
export const DanglingIndicesListDanglingIndicesRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'DanglingIndicesListDanglingIndicesRequest' })
export type DanglingIndicesListDanglingIndicesRequest = z.infer<typeof DanglingIndicesListDanglingIndicesRequest>

export const DanglingIndicesListDanglingIndicesResponse = z.object({
  dangling_indices: z.array(DanglingIndicesListDanglingIndicesDanglingIndex)
}).meta({ id: 'DanglingIndicesListDanglingIndicesResponse' })
export type DanglingIndicesListDanglingIndicesResponse = z.infer<typeof DanglingIndicesListDanglingIndicesResponse>
