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

export const CatCatComponentColumn = z.union([z.enum(['name', 'n', 'version', 'v', 'alias_count', 'a', 'mapping_count', 'm', 'settings_count', 's', 'metadata_count', 'me', 'included_in', 'i']), z.string()]).meta({ id: 'CatCatComponentColumn' })
export type CatCatComponentColumn = z.infer<typeof CatCatComponentColumn>

export const CatCatComponentColumns = z.union([CatCatComponentColumn, z.array(CatCatComponentColumn)]).meta({ id: 'CatCatComponentColumns' })
export type CatCatComponentColumns = z.infer<typeof CatCatComponentColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatComponentTemplatesComponentTemplate = z.object({
  name: z.string(),
  version: z.union([z.string(), z.null()]),
  alias_count: z.string(),
  mapping_count: z.string(),
  settings_count: z.string(),
  metadata_count: z.string(),
  included_in: z.string()
}).meta({ id: 'CatComponentTemplatesComponentTemplate' })
export type CatComponentTemplatesComponentTemplate = z.infer<typeof CatComponentTemplatesComponentTemplate>

/**
 * Get component templates.
 *
 * Get information about component templates in a cluster.
 * Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use the get component template API.
 */
export const CatComponentTemplatesRequest = z.object({
  ...CatCatRequestBase.shape,
  name: z.string().describe('The name of the component template. It accepts wildcard expressions. If it is omitted, all component templates are returned.').optional().meta({ found_in: 'path' }),
  h: CatCatComponentColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatComponentTemplatesRequest' })
export type CatComponentTemplatesRequest = z.infer<typeof CatComponentTemplatesRequest>

export const CatComponentTemplatesResponse = z.array(CatComponentTemplatesComponentTemplate).meta({ id: 'CatComponentTemplatesResponse' })
export type CatComponentTemplatesResponse = z.infer<typeof CatComponentTemplatesResponse>
