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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

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
