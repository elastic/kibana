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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IndicesMigrateReindexModeEnum = z.enum(['upgrade']).meta({ id: 'IndicesMigrateReindexModeEnum' })
export type IndicesMigrateReindexModeEnum = z.infer<typeof IndicesMigrateReindexModeEnum>

export const IndicesMigrateReindexSourceIndex = z.object({
  index: IndexName
}).meta({ id: 'IndicesMigrateReindexSourceIndex' })
export type IndicesMigrateReindexSourceIndex = z.infer<typeof IndicesMigrateReindexSourceIndex>

export const IndicesMigrateReindexMigrateReindex = z.object({
  mode: IndicesMigrateReindexModeEnum.describe('Reindex mode. Currently only \'upgrade\' is supported.'),
  source: IndicesMigrateReindexSourceIndex.describe('The source index or data stream (only data streams are currently supported).')
}).meta({ id: 'IndicesMigrateReindexMigrateReindex' })
export type IndicesMigrateReindexMigrateReindex = z.infer<typeof IndicesMigrateReindexMigrateReindex>

/**
 * Reindex legacy backing indices.
 *
 * Reindex all legacy backing indices for a data stream.
 * This operation occurs in a persistent task.
 * The persistent task ID is returned immediately and the reindexing work is completed in that task.
 */
export const IndicesMigrateReindexRequest = z.object({
  ...RequestBase.shape,
  reindex: IndicesMigrateReindexMigrateReindex.meta({ found_in: 'body' })
}).meta({ id: 'IndicesMigrateReindexRequest' })
export type IndicesMigrateReindexRequest = z.infer<typeof IndicesMigrateReindexRequest>

export const IndicesMigrateReindexResponse = AcknowledgedResponseBase.meta({ id: 'IndicesMigrateReindexResponse' })
export type IndicesMigrateReindexResponse = z.infer<typeof IndicesMigrateReindexResponse>
