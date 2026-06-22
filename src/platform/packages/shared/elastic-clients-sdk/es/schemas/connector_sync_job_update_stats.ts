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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Set the connector sync job stats.
 *
 * Stats include: `deleted_document_count`, `indexed_document_count`, `indexed_document_volume`, and `total_document_count`.
 * You can also update `last_seen`.
 * This API is mainly used by the connector service for updating sync job information.
 *
 * To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
 * This service runs automatically on Elastic Cloud for Elastic managed connectors.
 */
export const ConnectorSyncJobUpdateStatsRequest = z.object({
  ...RequestBase.shape,
  connector_sync_job_id: Id.describe('The unique identifier of the connector sync job.').meta({ found_in: 'path' }),
  deleted_document_count: long.describe('The number of documents the sync job deleted.').meta({ found_in: 'body' }),
  indexed_document_count: long.describe('The number of documents the sync job indexed.').meta({ found_in: 'body' }),
  indexed_document_volume: long.describe('The total size of the data (in MiB) the sync job indexed.').meta({ found_in: 'body' }),
  last_seen: Duration.describe('The timestamp to use in the `last_seen` property for the connector sync job.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('The connector-specific metadata.').optional().meta({ found_in: 'body' }),
  total_document_count: integer.describe('The total number of documents in the target index after the sync job finished.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ConnectorSyncJobUpdateStatsRequest' })
export type ConnectorSyncJobUpdateStatsRequest = z.infer<typeof ConnectorSyncJobUpdateStatsRequest>

export const ConnectorSyncJobUpdateStatsResponse = z.object({
}).meta({ id: 'ConnectorSyncJobUpdateStatsResponse' })
export type ConnectorSyncJobUpdateStatsResponse = z.infer<typeof ConnectorSyncJobUpdateStatsResponse>
