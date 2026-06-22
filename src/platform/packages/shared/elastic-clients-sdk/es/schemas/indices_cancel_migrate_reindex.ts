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

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Cancel a migration reindex operation.
 *
 * Cancel a migration reindex attempt for a data stream or index.
 */
export const IndicesCancelMigrateReindexRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('The index or data stream name').meta({ found_in: 'path' })
}).meta({ id: 'IndicesCancelMigrateReindexRequest' })
export type IndicesCancelMigrateReindexRequest = z.infer<typeof IndicesCancelMigrateReindexRequest>

export const IndicesCancelMigrateReindexResponse = AcknowledgedResponseBase.meta({ id: 'IndicesCancelMigrateReindexResponse' })
export type IndicesCancelMigrateReindexResponse = z.infer<typeof IndicesCancelMigrateReindexResponse>
