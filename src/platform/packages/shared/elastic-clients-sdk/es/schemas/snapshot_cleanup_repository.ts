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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SnapshotCleanupRepositoryCleanupRepositoryResults = z.object({
  deleted_blobs: long.describe('The number of binary large objects (blobs) removed from the snapshot repository during cleanup operations. A non-zero value indicates that unreferenced blobs were found and subsequently cleaned up.'),
  deleted_bytes: long.describe('The number of bytes freed by cleanup operations.')
}).meta({ id: 'SnapshotCleanupRepositoryCleanupRepositoryResults' })
export type SnapshotCleanupRepositoryCleanupRepositoryResults = z.infer<typeof SnapshotCleanupRepositoryCleanupRepositoryResults>

/**
 * Clean up the snapshot repository.
 *
 * Trigger the review of the contents of a snapshot repository and delete any stale data not referenced by existing snapshots.
 */
export const SnapshotCleanupRepositoryRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the snapshot repository to clean up.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response will indicate that it was not completely acknowledged. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotCleanupRepositoryRequest' })
export type SnapshotCleanupRepositoryRequest = z.infer<typeof SnapshotCleanupRepositoryRequest>

export const SnapshotCleanupRepositoryResponse = z.object({
  results: SnapshotCleanupRepositoryCleanupRepositoryResults.describe('Statistics for cleanup operations.')
}).meta({ id: 'SnapshotCleanupRepositoryResponse' })
export type SnapshotCleanupRepositoryResponse = z.infer<typeof SnapshotCleanupRepositoryResponse>
