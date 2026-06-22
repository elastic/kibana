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

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const CatCatFieldDataColumn = z.union([z.enum(['id', 'host', 'h', 'ip', 'node', 'n', 'field', 'f', 'size', 's']), z.string()]).meta({ id: 'CatCatFieldDataColumn' })
export type CatCatFieldDataColumn = z.infer<typeof CatCatFieldDataColumn>

export const CatCatFieldDataColumns = z.union([CatCatFieldDataColumn, z.array(CatCatFieldDataColumn)]).meta({ id: 'CatCatFieldDataColumns' })
export type CatCatFieldDataColumns = z.infer<typeof CatCatFieldDataColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatFielddataFielddataRecord = z.object({
  id: z.string().describe('node id').optional(),
  host: z.string().describe('host name').optional(),
  h: z.string().describe('host name').optional(),
  ip: z.string().describe('ip address').optional(),
  node: z.string().describe('node name').optional(),
  n: z.string().describe('node name').optional(),
  field: z.string().describe('field name').optional(),
  f: z.string().describe('field name').optional(),
  size: z.string().describe('field data usage').optional()
}).meta({ id: 'CatFielddataFielddataRecord' })
export type CatFielddataFielddataRecord = z.infer<typeof CatFielddataFielddataRecord>

/**
 * Get field data cache information.
 *
 * Get the amount of heap memory currently used by the field data cache on every data node in the cluster.
 *
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use the nodes stats API.
 */
export const CatFielddataRequest = z.object({
  ...CatCatRequestBase.shape,
  fields: Fields.describe('Comma-separated list of fields used to limit returned information. To retrieve all fields, omit this parameter.').optional().meta({ found_in: 'path' }),
  h: CatCatFieldDataColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatFielddataRequest' })
export type CatFielddataRequest = z.infer<typeof CatFielddataRequest>

export const CatFielddataResponse = z.array(CatFielddataFielddataRecord).meta({ id: 'CatFielddataResponse' })
export type CatFielddataResponse = z.infer<typeof CatFielddataResponse>
