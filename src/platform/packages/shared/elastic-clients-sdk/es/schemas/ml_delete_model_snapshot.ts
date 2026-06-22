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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete a model snapshot.
 *
 * You cannot delete the active model snapshot. To delete that snapshot, first
 * revert to a different one. To identify the active model snapshot, refer to
 * the `model_snapshot_id` in the results from the get jobs API.
 */
export const MlDeleteModelSnapshotRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('Identifier for the model snapshot.').meta({ found_in: 'path' })
}).meta({ id: 'MlDeleteModelSnapshotRequest' })
export type MlDeleteModelSnapshotRequest = z.infer<typeof MlDeleteModelSnapshotRequest>

export const MlDeleteModelSnapshotResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteModelSnapshotResponse' })
export type MlDeleteModelSnapshotResponse = z.infer<typeof MlDeleteModelSnapshotResponse>
