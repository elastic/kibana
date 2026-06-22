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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const CatCatCircuitBreakerColumn = z.union([z.enum(['node_id', 'id', 'node_name', 'nn', 'breaker', 'br', 'limit', 'l', 'limit_bytes', 'lb', 'estimated', 'e', 'estimated_bytes', 'eb', 'tripped', 't', 'overhead', 'o']), z.string()]).meta({ id: 'CatCatCircuitBreakerColumn' })
export type CatCatCircuitBreakerColumn = z.infer<typeof CatCatCircuitBreakerColumn>

export const CatCatCircuitBreakerColumns = z.union([CatCatCircuitBreakerColumn, z.array(CatCatCircuitBreakerColumn)]).meta({ id: 'CatCatCircuitBreakerColumns' })
export type CatCatCircuitBreakerColumns = z.infer<typeof CatCatCircuitBreakerColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCircuitBreakerCircuitBreakerRecord = z.object({
  node_id: NodeId.describe('Persistent node ID').optional(),
  id: NodeId.describe('Persistent node ID').optional(),
  node_name: z.string().describe('Node name').optional(),
  nn: z.string().describe('Node name').optional(),
  breaker: z.string().describe('Breaker name').optional(),
  br: z.string().describe('Breaker name').optional(),
  limit: z.string().describe('Limit size').optional(),
  l: z.string().describe('Limit size').optional(),
  limit_bytes: ByteSize.describe('Limit size in bytes').optional(),
  lb: ByteSize.describe('Limit size in bytes').optional(),
  estimated: z.string().describe('Estimated size').optional(),
  e: z.string().describe('Estimated size').optional(),
  estimated_bytes: ByteSize.describe('Estimated size in bytes').optional(),
  eb: ByteSize.describe('Estimated size in bytes').optional(),
  tripped: z.string().describe('Tripped count').optional(),
  t: z.string().describe('Tripped count').optional(),
  overhead: z.string().describe('Overhead').optional(),
  o: z.string().describe('Overhead').optional()
}).meta({ id: 'CatCircuitBreakerCircuitBreakerRecord' })
export type CatCircuitBreakerCircuitBreakerRecord = z.infer<typeof CatCircuitBreakerCircuitBreakerRecord>

/**
 * Get circuit breakers statistics.
 *
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.
 */
export const CatCircuitBreakerRequest = z.object({
  ...CatCatRequestBase.shape,
  circuit_breaker_patterns: z.union([z.string(), z.array(z.string())]).describe('A comma-separated list of regular-expressions to filter the circuit breakers in the output').optional().meta({ found_in: 'path' }),
  h: CatCatCircuitBreakerColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatCircuitBreakerRequest' })
export type CatCircuitBreakerRequest = z.infer<typeof CatCircuitBreakerRequest>

export const CatCircuitBreakerResponse = z.array(CatCircuitBreakerCircuitBreakerRecord).meta({ id: 'CatCircuitBreakerResponse' })
export type CatCircuitBreakerResponse = z.infer<typeof CatCircuitBreakerResponse>
