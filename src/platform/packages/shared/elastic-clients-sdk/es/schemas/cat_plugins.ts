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

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const CatCatPluginsColumn = z.union([z.enum(['id', 'name', 'n', 'component', 'c', 'version', 'v', 'description', 'd']), z.string()]).meta({ id: 'CatCatPluginsColumn' })
export type CatCatPluginsColumn = z.infer<typeof CatCatPluginsColumn>

export const CatCatPluginsColumns = z.union([CatCatPluginsColumn, z.array(CatCatPluginsColumn)]).meta({ id: 'CatCatPluginsColumns' })
export type CatCatPluginsColumns = z.infer<typeof CatCatPluginsColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatPluginsPluginsRecord = z.object({
  id: NodeId.describe('The unique node identifier.').optional(),
  name: Name.describe('The node name.').optional(),
  n: Name.describe('The node name.').optional(),
  component: z.string().describe('The component name.').optional(),
  c: z.string().describe('The component name.').optional(),
  version: VersionString.describe('The component version.').optional(),
  v: VersionString.describe('The component version.').optional(),
  description: z.string().describe('The plugin details.').optional(),
  d: z.string().describe('The plugin details.').optional(),
  type: z.string().describe('The plugin type.').optional(),
  t: z.string().describe('The plugin type.').optional()
}).meta({ id: 'CatPluginsPluginsRecord' })
export type CatPluginsPluginsRecord = z.infer<typeof CatPluginsPluginsRecord>

/**
 * Get plugin information.
 *
 * Get a list of plugins running on each node of a cluster.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatPluginsRequest = z.object({
  ...CatCatRequestBase.shape,
  h: CatCatPluginsColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  include_bootstrap: z.boolean().describe('Include bootstrap plugins in the response').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatPluginsRequest' })
export type CatPluginsRequest = z.infer<typeof CatPluginsRequest>

export const CatPluginsResponse = z.array(CatPluginsPluginsRecord).meta({ id: 'CatPluginsResponse' })
export type CatPluginsResponse = z.infer<typeof CatPluginsResponse>
