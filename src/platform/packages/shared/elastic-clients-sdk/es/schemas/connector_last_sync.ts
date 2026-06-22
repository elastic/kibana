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

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ConnectorSyncStatus = z.enum(['canceling', 'canceled', 'completed', 'error', 'in_progress', 'pending', 'suspended']).meta({ id: 'ConnectorSyncStatus' })
export type ConnectorSyncStatus = z.infer<typeof ConnectorSyncStatus>

/**
 * Update the connector last sync stats.
 *
 * Update the fields related to the last sync of a connector.
 * This action is used for analytics and monitoring.
 */
export const ConnectorLastSyncRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated').meta({ found_in: 'path' }),
  last_access_control_sync_error: z.string().optional().meta({ found_in: 'body' }),
  last_access_control_sync_scheduled_at: DateTime.optional().meta({ found_in: 'body' }),
  last_access_control_sync_status: ConnectorSyncStatus.optional().meta({ found_in: 'body' }),
  last_deleted_document_count: long.optional().meta({ found_in: 'body' }),
  last_incremental_sync_scheduled_at: DateTime.optional().meta({ found_in: 'body' }),
  last_indexed_document_count: long.optional().meta({ found_in: 'body' }),
  last_seen: DateTime.optional().meta({ found_in: 'body' }),
  last_sync_error: z.string().optional().meta({ found_in: 'body' }),
  last_sync_scheduled_at: DateTime.optional().meta({ found_in: 'body' }),
  last_sync_status: ConnectorSyncStatus.optional().meta({ found_in: 'body' }),
  last_synced: DateTime.optional().meta({ found_in: 'body' }),
  sync_cursor: z.any().optional().meta({ found_in: 'body' })
}).meta({ id: 'ConnectorLastSyncRequest' })
export type ConnectorLastSyncRequest = z.infer<typeof ConnectorLastSyncRequest>

export const ConnectorLastSyncResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorLastSyncResponse' })
export type ConnectorLastSyncResponse = z.infer<typeof ConnectorLastSyncResponse>
