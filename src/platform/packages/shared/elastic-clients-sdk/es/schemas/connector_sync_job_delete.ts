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
 * Delete a connector sync job.
 *
 * Remove a connector sync job and its associated data.
 * This is a destructive action that is not recoverable.
 */
export const ConnectorSyncJobDeleteRequest = z.object({
  ...RequestBase.shape,
  connector_sync_job_id: Id.describe('The unique identifier of the connector sync job to be deleted').meta({ found_in: 'path' })
}).meta({ id: 'ConnectorSyncJobDeleteRequest' })
export type ConnectorSyncJobDeleteRequest = z.infer<typeof ConnectorSyncJobDeleteRequest>

export const ConnectorSyncJobDeleteResponse = AcknowledgedResponseBase.meta({ id: 'ConnectorSyncJobDeleteResponse' })
export type ConnectorSyncJobDeleteResponse = z.infer<typeof ConnectorSyncJobDeleteResponse>
