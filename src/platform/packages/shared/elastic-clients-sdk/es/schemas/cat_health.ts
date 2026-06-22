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

export const CatCatHealthColumn = z.union([z.enum(['epoch', 't', 'time', 'timestamp', 'ts', 'hms', 'hhmmss', 'cluster', 'cl', 'status', 'st', 'node.total', 'nt', 'nodeTotal', 'node.data', 'nd', 'nodeData', 'shards', 't', 'sh', 'shards.total', 'shardsTotal', 'pri', 'p', 'shards.primary', 'shardsPrimary', 'relo', 'r', 'shards.relocating', 'shardsRelocating', 'init', 'i', 'shards.initializing', 'shardsInitializing', 'unassign', 'u', 'shards.unassigned', 'shardsUnassigned', 'unassign.pri', 'up', 'shards.unassigned.primary', 'shardsUnassignedPrimary', 'pending_tasks', 'pt', 'pendingTasks', 'max_task_wait_time', 'mtwt', 'maxTaskWaitTime', 'active_shards_percent', 'asp', 'activeShardsPercent']), z.string()]).meta({ id: 'CatCatHealthColumn' })
export type CatCatHealthColumn = z.infer<typeof CatCatHealthColumn>

export const CatCatHealthColumns = z.union([CatCatHealthColumn, z.array(CatCatHealthColumn)]).meta({ id: 'CatCatHealthColumns' })
export type CatCatHealthColumns = z.infer<typeof CatCatHealthColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatHealthHealthRecord = z.object({
  epoch: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  time: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  timestamp: TimeOfDay.describe('time in HH:MM:SS').optional(),
  ts: TimeOfDay.describe('time in HH:MM:SS').optional(),
  hms: TimeOfDay.describe('time in HH:MM:SS').optional(),
  hhmmss: TimeOfDay.describe('time in HH:MM:SS').optional(),
  cluster: z.string().describe('cluster name').optional(),
  cl: z.string().describe('cluster name').optional(),
  status: z.string().describe('health status').optional(),
  st: z.string().describe('health status').optional(),
  'node.total': z.string().describe('total number of nodes').optional(),
  nt: z.string().describe('total number of nodes').optional(),
  nodeTotal: z.string().describe('total number of nodes').optional(),
  'node.data': z.string().describe('number of nodes that can store data').optional(),
  nd: z.string().describe('number of nodes that can store data').optional(),
  nodeData: z.string().describe('number of nodes that can store data').optional(),
  shards: z.string().describe('total number of shards').optional(),
  t: z.string().describe('total number of shards').optional(),
  sh: z.string().describe('total number of shards').optional(),
  'shards.total': z.string().describe('total number of shards').optional(),
  shardsTotal: z.string().describe('total number of shards').optional(),
  pri: z.string().describe('number of primary shards').optional(),
  p: z.string().describe('number of primary shards').optional(),
  'shards.primary': z.string().describe('number of primary shards').optional(),
  shardsPrimary: z.string().describe('number of primary shards').optional(),
  relo: z.string().describe('number of relocating nodes').optional(),
  r: z.string().describe('number of relocating nodes').optional(),
  'shards.relocating': z.string().describe('number of relocating nodes').optional(),
  shardsRelocating: z.string().describe('number of relocating nodes').optional(),
  init: z.string().describe('number of initializing nodes').optional(),
  i: z.string().describe('number of initializing nodes').optional(),
  'shards.initializing': z.string().describe('number of initializing nodes').optional(),
  shardsInitializing: z.string().describe('number of initializing nodes').optional(),
  'unassign.pri': z.string().describe('number of unassigned primary shards').optional(),
  up: z.string().describe('number of unassigned primary shards').optional(),
  'shards.unassigned.primary': z.string().describe('number of unassigned primary shards').optional(),
  shardsUnassignedPrimary: z.string().describe('number of unassigned primary shards').optional(),
  unassign: z.string().describe('number of unassigned shards').optional(),
  u: z.string().describe('number of unassigned shards').optional(),
  'shards.unassigned': z.string().describe('number of unassigned shards').optional(),
  shardsUnassigned: z.string().describe('number of unassigned shards').optional(),
  pending_tasks: z.string().describe('number of pending tasks').optional(),
  pt: z.string().describe('number of pending tasks').optional(),
  pendingTasks: z.string().describe('number of pending tasks').optional(),
  max_task_wait_time: z.string().describe('wait time of longest task pending').optional(),
  mtwt: z.string().describe('wait time of longest task pending').optional(),
  maxTaskWaitTime: z.string().describe('wait time of longest task pending').optional(),
  active_shards_percent: z.string().describe('active number of shards in percent').optional(),
  asp: z.string().describe('active number of shards in percent').optional(),
  activeShardsPercent: z.string().describe('active number of shards in percent').optional()
}).meta({ id: 'CatHealthHealthRecord' })
export type CatHealthHealthRecord = z.infer<typeof CatHealthHealthRecord>

/**
 * Get the cluster health status.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use the cluster health API.
 * This API is often used to check malfunctioning clusters.
 * To help you track cluster health alongside log files and alerting systems, the API returns timestamps in two formats:
 * `HH:MM:SS`, which is human-readable but includes no date information;
 * `Unix epoch time`, which is machine-sortable and includes date information.
 * The latter format is useful for cluster recoveries that take multiple days.
 * You can use the cat health API to verify cluster health across multiple nodes.
 * You also can use the API to track the recovery of a large cluster over a longer period of time.
 */
export const CatHealthRequest = z.object({
  ...CatCatRequestBase.shape,
  ts: z.boolean().describe('If true, returns `HH:MM:SS` and Unix epoch timestamps.').optional().meta({ found_in: 'query' }),
  h: CatCatHealthColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatHealthRequest' })
export type CatHealthRequest = z.infer<typeof CatHealthRequest>

export const CatHealthResponse = z.array(CatHealthHealthRecord).meta({ id: 'CatHealthResponse' })
export type CatHealthResponse = z.infer<typeof CatHealthResponse>
