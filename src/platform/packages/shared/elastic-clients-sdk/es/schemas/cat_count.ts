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
 * Some APIs will return values such as numbers also as a string (notably epoch timestamps). This behavior
 * is used to capture this behavior while keeping the semantics of the field type.
 *
 * Depending on the target language, code generators can keep the union or remove it and leniently parse
 * strings to the target type.
 */
export const SpecUtilsStringified = z.union([z.any(), z.string()]).meta({ id: 'SpecUtilsStringified' })
export type SpecUtilsStringified = z.infer<typeof SpecUtilsStringified>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/** Time of day, expressed as HH:MM:SS */
export const TimeOfDay = z.string().meta({ id: 'TimeOfDay' })
export type TimeOfDay = z.infer<typeof TimeOfDay>

export const CatCatCountColumn = z.union([z.enum(['epoch', 't', 'time', 'timestamp', 'ts', 'hms', 'hhmmss', 'count', 'dc', 'docs.count', 'docsCount']), z.string()]).meta({ id: 'CatCatCountColumn' })
export type CatCatCountColumn = z.infer<typeof CatCatCountColumn>

export const CatCatCountColumns = z.union([CatCatCountColumn, z.array(CatCatCountColumn)]).meta({ id: 'CatCatCountColumns' })
export type CatCatCountColumns = z.infer<typeof CatCatCountColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCountCountRecord = z.object({
  epoch: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  t: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  time: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  timestamp: TimeOfDay.describe('time in HH:MM:SS').optional(),
  ts: TimeOfDay.describe('time in HH:MM:SS').optional(),
  hms: TimeOfDay.describe('time in HH:MM:SS').optional(),
  hhmmss: TimeOfDay.describe('time in HH:MM:SS').optional(),
  count: z.string().describe('the document count').optional(),
  dc: z.string().describe('the document count').optional(),
  'docs.count': z.string().describe('the document count').optional(),
  docsCount: z.string().describe('the document count').optional()
}).meta({ id: 'CatCountCountRecord' })
export type CatCountCountRecord = z.infer<typeof CatCountCountRecord>

/**
 * Get a document count.
 *
 * Get quick access to a document count for a data stream, an index, or an entire cluster.
 * The document count only includes live documents, not deleted documents which have not yet been removed by the merge process.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use the count API.
 *
 * NOTE: Starting in Elasticsearch 9.3.0, this endpoint also supports the `POST` method. This is primarily intended for project routing in serverless environments.
 */
export const CatCountRequest = z.object({
  ...CatCatRequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases used to limit the request. It supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  h: CatCatCountColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatCountRequest' })
export type CatCountRequest = z.infer<typeof CatCountRequest>

export const CatCountResponse = z.array(CatCountCountRecord).meta({ id: 'CatCountResponse' })
export type CatCountResponse = z.infer<typeof CatCountResponse>
