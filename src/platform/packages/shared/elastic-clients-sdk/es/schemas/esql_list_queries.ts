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

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TaskId = z.string().meta({ id: 'TaskId' })
export type TaskId = z.infer<typeof TaskId>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const EsqlListQueriesBody = z.object({
  id: long,
  node: NodeId,
  start_time_millis: long,
  running_time_nanos: long,
  query: z.string()
}).meta({ id: 'EsqlListQueriesBody' })
export type EsqlListQueriesBody = z.infer<typeof EsqlListQueriesBody>

/**
 * Get running ES|QL queries information.
 *
 * Returns an object containing IDs and other information about the running ES|QL queries.
 */
export const EsqlListQueriesRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'EsqlListQueriesRequest' })
export type EsqlListQueriesRequest = z.infer<typeof EsqlListQueriesRequest>

export const EsqlListQueriesResponse = z.object({
  queries: z.record(TaskId, EsqlListQueriesBody)
}).meta({ id: 'EsqlListQueriesResponse' })
export type EsqlListQueriesResponse = z.infer<typeof EsqlListQueriesResponse>
