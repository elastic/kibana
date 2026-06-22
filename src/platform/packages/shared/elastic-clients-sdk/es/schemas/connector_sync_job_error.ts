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
 * Set a connector sync job error.
 *
 * Set the `error` field for a connector sync job and set its `status` to `error`.
 *
 * To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
 * This service runs automatically on Elastic Cloud for Elastic managed connectors.
 */
export const ConnectorSyncJobErrorRequest = z.object({
  ...RequestBase.shape,
  connector_sync_job_id: Id.describe('The unique identifier for the connector sync job.').meta({ found_in: 'path' }),
  error: z.string().describe('The error for the connector sync job error field.').meta({ found_in: 'body' })
}).meta({ id: 'ConnectorSyncJobErrorRequest' })
export type ConnectorSyncJobErrorRequest = z.infer<typeof ConnectorSyncJobErrorRequest>

export const ConnectorSyncJobErrorResponse = z.object({
}).meta({ id: 'ConnectorSyncJobErrorResponse' })
export type ConnectorSyncJobErrorResponse = z.infer<typeof ConnectorSyncJobErrorResponse>
