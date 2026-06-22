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
 * Check in a connector sync job.
 *
 * Check in a connector sync job and set the `last_seen` field to the current time before updating it in the internal index.
 *
 * To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
 * This service runs automatically on Elastic Cloud for Elastic managed connectors.
 */
export const ConnectorSyncJobCheckInRequest = z.object({
  ...RequestBase.shape,
  connector_sync_job_id: Id.describe('The unique identifier of the connector sync job to be checked in.').meta({ found_in: 'path' })
}).meta({ id: 'ConnectorSyncJobCheckInRequest' })
export type ConnectorSyncJobCheckInRequest = z.infer<typeof ConnectorSyncJobCheckInRequest>

export const ConnectorSyncJobCheckInResponse = z.object({
}).meta({ id: 'ConnectorSyncJobCheckInResponse' })
export type ConnectorSyncJobCheckInResponse = z.infer<typeof ConnectorSyncJobCheckInResponse>
