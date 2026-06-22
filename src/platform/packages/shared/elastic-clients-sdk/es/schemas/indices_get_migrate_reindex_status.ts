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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Get the migration reindexing status.
 *
 * Get the status of a migration reindex attempt for a data stream or index.
 */
export const IndicesGetMigrateReindexStatusRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('The index or data stream name.').meta({ found_in: 'path' })
}).meta({ id: 'IndicesGetMigrateReindexStatusRequest' })
export type IndicesGetMigrateReindexStatusRequest = z.infer<typeof IndicesGetMigrateReindexStatusRequest>

export const IndicesGetMigrateReindexStatusStatusInProgress = z.object({
  index: z.string(),
  total_doc_count: long,
  reindexed_doc_count: long
}).meta({ id: 'IndicesGetMigrateReindexStatusStatusInProgress' })
export type IndicesGetMigrateReindexStatusStatusInProgress = z.infer<typeof IndicesGetMigrateReindexStatusStatusInProgress>

export const IndicesGetMigrateReindexStatusStatusError = z.object({
  index: z.string(),
  message: z.string()
}).meta({ id: 'IndicesGetMigrateReindexStatusStatusError' })
export type IndicesGetMigrateReindexStatusStatusError = z.infer<typeof IndicesGetMigrateReindexStatusStatusError>

export const IndicesGetMigrateReindexStatusResponse = z.object({
  start_time: DateTime.optional(),
  start_time_millis: EpochTime,
  complete: z.boolean(),
  total_indices_in_data_stream: integer,
  total_indices_requiring_upgrade: integer,
  successes: integer,
  in_progress: z.array(IndicesGetMigrateReindexStatusStatusInProgress),
  pending: integer,
  errors: z.array(IndicesGetMigrateReindexStatusStatusError),
  exception: z.string().optional()
}).meta({ id: 'IndicesGetMigrateReindexStatusResponse' })
export type IndicesGetMigrateReindexStatusResponse = z.infer<typeof IndicesGetMigrateReindexStatusResponse>
