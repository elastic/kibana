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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Get a specific running ES|QL query information.
 *
 * Returns an object extended information about a running ES|QL query.
 */
export const EsqlGetQueryRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The query ID').meta({ found_in: 'path' })
}).meta({ id: 'EsqlGetQueryRequest' })
export type EsqlGetQueryRequest = z.infer<typeof EsqlGetQueryRequest>

export const EsqlGetQueryResponse = z.object({
  id: long,
  node: NodeId,
  start_time_millis: long,
  running_time_nanos: long,
  query: z.string(),
  coordinating_node: NodeId,
  data_nodes: z.array(NodeId)
}).meta({ id: 'EsqlGetQueryResponse' })
export type EsqlGetQueryResponse = z.infer<typeof EsqlGetQueryResponse>
