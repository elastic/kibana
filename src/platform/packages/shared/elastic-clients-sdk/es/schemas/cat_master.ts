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

export const CatCatMasterColumn = z.union([z.enum(['id', 'host', 'h', 'ip', 'node', 'n']), z.string()]).meta({ id: 'CatCatMasterColumn' })
export type CatCatMasterColumn = z.infer<typeof CatCatMasterColumn>

export const CatCatMasterColumns = z.union([CatCatMasterColumn, z.array(CatCatMasterColumn)]).meta({ id: 'CatCatMasterColumns' })
export type CatCatMasterColumns = z.infer<typeof CatCatMasterColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatMasterMasterRecord = z.object({
  id: z.string().describe('node id').optional(),
  host: z.string().describe('host name').optional(),
  h: z.string().describe('host name').optional(),
  ip: z.string().describe('ip address').optional(),
  node: z.string().describe('node name').optional(),
  n: z.string().describe('node name').optional()
}).meta({ id: 'CatMasterMasterRecord' })
export type CatMasterMasterRecord = z.infer<typeof CatMasterMasterRecord>

/**
 * Get master node information.
 *
 * Get information about the master node, including the ID, bound IP address, and name.
 *
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatMasterRequest = z.object({
  ...CatCatRequestBase.shape,
  h: CatCatMasterColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatMasterRequest' })
export type CatMasterRequest = z.infer<typeof CatMasterRequest>

export const CatMasterResponse = z.array(CatMasterMasterRecord).meta({ id: 'CatMasterResponse' })
export type CatMasterResponse = z.infer<typeof CatMasterResponse>
