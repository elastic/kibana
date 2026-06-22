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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Host = z.string().meta({ id: 'Host' })
export type Host = z.infer<typeof Host>

export const Ip = z.string().meta({ id: 'Ip' })
export type Ip = z.infer<typeof Ip>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export const Percentage = z.union([z.string(), float]).meta({ id: 'Percentage' })
export type Percentage = z.infer<typeof Percentage>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const CatCatAllocationColumn = z.union([z.enum(['shards', 's', 'shards.undesired', 'write_load.forecast', 'wlf', 'writeLoadForecast', 'disk.indices.forecast', 'dif', 'diskIndicesForecast', 'disk.indices', 'di', 'diskIndices', 'disk.used', 'du', 'diskUsed', 'disk.avail', 'da', 'diskAvail', 'disk.total', 'dt', 'diskTotal', 'disk.percent', 'dp', 'diskPercent', 'host', 'h', 'ip', 'node', 'n', 'node.role', 'r', 'role', 'nodeRole']), z.string()]).meta({ id: 'CatCatAllocationColumn' })
export type CatCatAllocationColumn = z.infer<typeof CatCatAllocationColumn>

export const CatCatAllocationColumns = z.union([CatCatAllocationColumn, z.array(CatCatAllocationColumn)]).meta({ id: 'CatCatAllocationColumns' })
export type CatCatAllocationColumns = z.infer<typeof CatCatAllocationColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatAllocationAllocationRecord = z.object({
  shards: z.string().describe('Number of primary and replica shards assigned to the node.').optional(),
  s: z.string().describe('Number of primary and replica shards assigned to the node.').optional(),
  'shards.undesired': z.union([z.string(), z.null()]).describe('Amount of shards that are scheduled to be moved elsewhere in the cluster or -1 other than desired balance allocator is used').optional(),
  'write_load.forecast': z.union([SpecUtilsStringified, z.null()]).describe('Sum of index write load forecasts').optional(),
  wlf: z.union([SpecUtilsStringified, z.null()]).describe('Sum of index write load forecasts').optional(),
  writeLoadForecast: z.union([SpecUtilsStringified, z.null()]).describe('Sum of index write load forecasts').optional(),
  'disk.indices.forecast': z.union([ByteSize, z.null()]).describe('Sum of shard size forecasts').optional(),
  dif: z.union([ByteSize, z.null()]).describe('Sum of shard size forecasts').optional(),
  diskIndicesForecast: z.union([ByteSize, z.null()]).describe('Sum of shard size forecasts').optional(),
  'disk.indices': z.union([ByteSize, z.null()]).describe('Disk space used by the node’s shards. Does not include disk space for the translog or unassigned shards. IMPORTANT: This metric double-counts disk space for hard-linked files, such as those created when shrinking, splitting, or cloning an index.').optional(),
  di: z.union([ByteSize, z.null()]).describe('Disk space used by the node’s shards. Does not include disk space for the translog or unassigned shards. IMPORTANT: This metric double-counts disk space for hard-linked files, such as those created when shrinking, splitting, or cloning an index.').optional(),
  diskIndices: z.union([ByteSize, z.null()]).describe('Disk space used by the node’s shards. Does not include disk space for the translog or unassigned shards. IMPORTANT: This metric double-counts disk space for hard-linked files, such as those created when shrinking, splitting, or cloning an index.').optional(),
  'disk.used': z.union([ByteSize, z.null()]).describe('Total disk space in use. Elasticsearch retrieves this metric from the node’s operating system (OS). The metric includes disk space for: Elasticsearch, including the translog and unassigned shards; the node’s operating system; any other applications or files on the node. Unlike `disk.indices`, this metric does not double-count disk space for hard-linked files.').optional(),
  du: z.union([ByteSize, z.null()]).describe('Total disk space in use. Elasticsearch retrieves this metric from the node’s operating system (OS). The metric includes disk space for: Elasticsearch, including the translog and unassigned shards; the node’s operating system; any other applications or files on the node. Unlike `disk.indices`, this metric does not double-count disk space for hard-linked files.').optional(),
  diskUsed: z.union([ByteSize, z.null()]).describe('Total disk space in use. Elasticsearch retrieves this metric from the node’s operating system (OS). The metric includes disk space for: Elasticsearch, including the translog and unassigned shards; the node’s operating system; any other applications or files on the node. Unlike `disk.indices`, this metric does not double-count disk space for hard-linked files.').optional(),
  'disk.avail': z.union([ByteSize, z.null()]).describe('Free disk space available to Elasticsearch. Elasticsearch retrieves this metric from the node’s operating system. Disk-based shard allocation uses this metric to assign shards to nodes based on available disk space.').optional(),
  da: z.union([ByteSize, z.null()]).describe('Free disk space available to Elasticsearch. Elasticsearch retrieves this metric from the node’s operating system. Disk-based shard allocation uses this metric to assign shards to nodes based on available disk space.').optional(),
  diskAvail: z.union([ByteSize, z.null()]).describe('Free disk space available to Elasticsearch. Elasticsearch retrieves this metric from the node’s operating system. Disk-based shard allocation uses this metric to assign shards to nodes based on available disk space.').optional(),
  'disk.total': z.union([ByteSize, z.null()]).describe('Total disk space for the node, including in-use and available space.').optional(),
  dt: z.union([ByteSize, z.null()]).describe('Total disk space for the node, including in-use and available space.').optional(),
  diskTotal: z.union([ByteSize, z.null()]).describe('Total disk space for the node, including in-use and available space.').optional(),
  'disk.percent': z.union([Percentage, z.null()]).describe('Total percentage of disk space in use. Calculated as `disk.used / disk.total`.').optional(),
  dp: z.union([Percentage, z.null()]).describe('Total percentage of disk space in use. Calculated as `disk.used / disk.total`.').optional(),
  diskPercent: z.union([Percentage, z.null()]).describe('Total percentage of disk space in use. Calculated as `disk.used / disk.total`.').optional(),
  host: z.union([Host, z.null()]).describe('Network host for the node. Set using the `network.host` setting.').optional(),
  h: z.union([Host, z.null()]).describe('Network host for the node. Set using the `network.host` setting.').optional(),
  ip: z.union([Ip, z.null()]).describe('IP address and port for the node.').optional(),
  node: z.string().describe('Name for the node. Set using the `node.name` setting.').optional(),
  n: z.string().describe('Name for the node. Set using the `node.name` setting.').optional(),
  'node.role': z.union([z.string(), z.null()]).describe('Node roles').optional(),
  r: z.union([z.string(), z.null()]).describe('Node roles').optional(),
  role: z.union([z.string(), z.null()]).describe('Node roles').optional(),
  nodeRole: z.union([z.string(), z.null()]).describe('Node roles').optional()
}).meta({ id: 'CatAllocationAllocationRecord' })
export type CatAllocationAllocationRecord = z.infer<typeof CatAllocationAllocationRecord>

/**
 * Get shard allocation information.
 *
 * Get a snapshot of the number of shards allocated to each data node and their disk space.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.
 */
export const CatAllocationRequest = z.object({
  ...CatCatRequestBase.shape,
  node_id: NodeIds.describe('A comma-separated list of node identifiers or names used to limit the returned information.').optional().meta({ found_in: 'path' }),
  h: CatCatAllocationColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatAllocationRequest' })
export type CatAllocationRequest = z.infer<typeof CatAllocationRequest>

export const CatAllocationResponse = z.array(CatAllocationAllocationRecord).meta({ id: 'CatAllocationResponse' })
export type CatAllocationResponse = z.infer<typeof CatAllocationResponse>
