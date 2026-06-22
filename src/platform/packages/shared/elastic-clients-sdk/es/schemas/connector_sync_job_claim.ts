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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Claim a connector sync job.
 *
 * This action updates the job status to `in_progress` and sets the `last_seen` and `started_at` timestamps to the current time.
 * Additionally, it can set the `sync_cursor` property for the sync job.
 *
 * This API is not intended for direct connector management by users.
 * It supports the implementation of services that utilize the connector protocol to communicate with Elasticsearch.
 *
 * To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
 * This service runs automatically on Elastic Cloud for Elastic managed connectors.
 */
export const ConnectorSyncJobClaimRequest = z.object({
  ...RequestBase.shape,
  connector_sync_job_id: Id.describe('The unique identifier of the connector sync job.').meta({ found_in: 'path' }),
  sync_cursor: z.any().describe('The cursor object from the last incremental sync job. This should reference the `sync_cursor` field in the connector state for which the job runs.').optional().meta({ found_in: 'body' }),
  worker_hostname: z.string().describe('The host name of the current system that will run the job.').meta({ found_in: 'body' })
}).meta({ id: 'ConnectorSyncJobClaimRequest' })
export type ConnectorSyncJobClaimRequest = z.infer<typeof ConnectorSyncJobClaimRequest>

export const ConnectorSyncJobClaimResponse = z.object({
}).meta({ id: 'ConnectorSyncJobClaimResponse' })
export type ConnectorSyncJobClaimResponse = z.infer<typeof ConnectorSyncJobClaimResponse>
