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

export const CatCatPendingTasksColumn = z.union([z.enum(['insertOrder', 'o', 'timeInQueue', 't', 'priority', 'p', 'source', 's']), z.string()]).meta({ id: 'CatCatPendingTasksColumn' })
export type CatCatPendingTasksColumn = z.infer<typeof CatCatPendingTasksColumn>

export const CatCatPendingTasksColumns = z.union([CatCatPendingTasksColumn, z.array(CatCatPendingTasksColumn)]).meta({ id: 'CatCatPendingTasksColumns' })
export type CatCatPendingTasksColumns = z.infer<typeof CatCatPendingTasksColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatPendingTasksPendingTasksRecord = z.object({
  insertOrder: z.string().describe('The task insertion order.').optional(),
  o: z.string().describe('The task insertion order.').optional(),
  timeInQueue: z.string().describe('Indicates how long the task has been in queue.').optional(),
  t: z.string().describe('Indicates how long the task has been in queue.').optional(),
  priority: z.string().describe('The task priority.').optional(),
  p: z.string().describe('The task priority.').optional(),
  source: z.string().describe('The task source.').optional(),
  s: z.string().describe('The task source.').optional()
}).meta({ id: 'CatPendingTasksPendingTasksRecord' })
export type CatPendingTasksPendingTasksRecord = z.infer<typeof CatPendingTasksPendingTasksRecord>

/**
 * Get pending task information.
 *
 * Get information about cluster-level changes that have not yet taken effect.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the pending cluster tasks API.
 */
export const CatPendingTasksRequest = z.object({
  ...CatCatRequestBase.shape,
  h: CatCatPendingTasksColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatPendingTasksRequest' })
export type CatPendingTasksRequest = z.infer<typeof CatPendingTasksRequest>

export const CatPendingTasksResponse = z.array(CatPendingTasksPendingTasksRecord).meta({ id: 'CatPendingTasksResponse' })
export type CatPendingTasksResponse = z.infer<typeof CatPendingTasksResponse>
