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

export const CatCatNodeattrsColumn = z.union([z.enum(['node', 'id', 'id', 'nodeId', 'pid', 'p', 'host', 'h', 'ip', 'i', 'port', 'po', 'attr', 'attr.name', 'value', 'attr.value']), z.string()]).meta({ id: 'CatCatNodeattrsColumn' })
export type CatCatNodeattrsColumn = z.infer<typeof CatCatNodeattrsColumn>

export const CatCatNodeattrsColumns = z.union([CatCatNodeattrsColumn, z.array(CatCatNodeattrsColumn)]).meta({ id: 'CatCatNodeattrsColumns' })
export type CatCatNodeattrsColumns = z.infer<typeof CatCatNodeattrsColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatNodeattrsNodeAttributesRecord = z.object({
  node: z.string().describe('The node name.').optional(),
  id: z.string().describe('The unique node identifier.').optional(),
  pid: z.string().describe('The process identifier.').optional(),
  host: z.string().describe('The host name.').optional(),
  h: z.string().describe('The host name.').optional(),
  ip: z.string().describe('The IP address.').optional(),
  i: z.string().describe('The IP address.').optional(),
  port: z.string().describe('The bound transport port.').optional(),
  attr: z.string().describe('The attribute name.').optional(),
  value: z.string().describe('The attribute value.').optional()
}).meta({ id: 'CatNodeattrsNodeAttributesRecord' })
export type CatNodeattrsNodeAttributesRecord = z.infer<typeof CatNodeattrsNodeAttributesRecord>

/**
 * Get node attribute information.
 *
 * Get information about custom node attributes.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatNodeattrsRequest = z.object({
  ...CatCatRequestBase.shape,
  h: CatCatNodeattrsColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatNodeattrsRequest' })
export type CatNodeattrsRequest = z.infer<typeof CatNodeattrsRequest>

export const CatNodeattrsResponse = z.array(CatNodeattrsNodeAttributesRecord).meta({ id: 'CatNodeattrsResponse' })
export type CatNodeattrsResponse = z.infer<typeof CatNodeattrsResponse>
