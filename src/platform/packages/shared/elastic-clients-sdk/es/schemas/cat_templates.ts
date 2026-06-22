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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCatTemplatesColumn = z.union([z.enum(['name', 'n', 'index_patterns', 't', 'order', 'o', 'p', 'version', 'v', 'composed_of', 'c']), z.string()]).meta({ id: 'CatCatTemplatesColumn' })
export type CatCatTemplatesColumn = z.infer<typeof CatCatTemplatesColumn>

export const CatCatTemplatesColumns = z.union([CatCatTemplatesColumn, z.array(CatCatTemplatesColumn)]).meta({ id: 'CatCatTemplatesColumns' })
export type CatCatTemplatesColumns = z.infer<typeof CatCatTemplatesColumns>

/**
 * Get index template information.
 *
 * Get information about the index templates in a cluster.
 * You can use index templates to apply index settings and field mappings to new indices at creation.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get index template API.
 */
export const CatTemplatesRequest = z.object({
  ...CatCatRequestBase.shape,
  name: Name.describe('The name of the template to return. Accepts wildcard expressions. If omitted, all templates are returned.').optional().meta({ found_in: 'path' }),
  h: CatCatTemplatesColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatTemplatesRequest' })
export type CatTemplatesRequest = z.infer<typeof CatTemplatesRequest>

export const CatTemplatesTemplatesRecord = z.object({
  name: Name.describe('The template name.').optional(),
  n: Name.describe('The template name.').optional(),
  index_patterns: z.string().describe('The template index patterns.').optional(),
  t: z.string().describe('The template index patterns.').optional(),
  order: z.string().describe('The template application order or priority number.').optional(),
  o: z.string().describe('The template application order or priority number.').optional(),
  p: z.string().describe('The template application order or priority number.').optional(),
  version: z.union([VersionString, z.null()]).describe('The template version.').optional(),
  v: z.union([VersionString, z.null()]).describe('The template version.').optional(),
  composed_of: z.string().describe('The component templates that comprise the index template.').optional(),
  c: z.string().describe('The component templates that comprise the index template.').optional()
}).meta({ id: 'CatTemplatesTemplatesRecord' })
export type CatTemplatesTemplatesRecord = z.infer<typeof CatTemplatesTemplatesRecord>

export const CatTemplatesResponse = z.array(CatTemplatesTemplatesRecord).meta({ id: 'CatTemplatesResponse' })
export type CatTemplatesResponse = z.infer<typeof CatTemplatesResponse>
