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
 * Delete a connector.
 *
 * Removes a connector and associated sync jobs.
 * This is a destructive action that is not recoverable.
 * NOTE: This action doesn’t delete any API keys, ingest pipelines, or data indices associated with the connector.
 * These need to be removed manually.
 */
export const ConnectorDeleteRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be deleted').meta({ found_in: 'path' }),
  delete_sync_jobs: z.boolean().describe('A flag indicating if associated sync jobs should be also removed.').optional().meta({ found_in: 'query' }),
  hard: z.boolean().describe('A flag indicating if the connector should be hard deleted.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ConnectorDeleteRequest' })
export type ConnectorDeleteRequest = z.infer<typeof ConnectorDeleteRequest>

export const ConnectorDeleteResponse = AcknowledgedResponseBase.meta({ id: 'ConnectorDeleteResponse' })
export type ConnectorDeleteResponse = z.infer<typeof ConnectorDeleteResponse>
