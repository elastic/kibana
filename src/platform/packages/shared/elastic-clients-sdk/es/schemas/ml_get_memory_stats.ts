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

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** Contains statistics about the number of nodes selected by the request. */
export const NodeStatistics = z.object({
  failures: z.array(z.lazy(() => ErrorCause)).optional(),
  total: integer.describe('Total number of nodes selected by the request.'),
  successful: integer.describe('Number of nodes that responded successfully to the request.'),
  failed: integer.describe('Number of nodes that rejected the request or failed to respond. If this value is not 0, a reason for the rejection or failure is included in the response.')
}).meta({ id: 'NodeStatistics' })
export type NodeStatistics = z.infer<typeof NodeStatistics>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TransportAddress = z.string().meta({ id: 'TransportAddress' })
export type TransportAddress = z.infer<typeof TransportAddress>

export const MlGetMemoryStatsJvmStats = z.object({
  heap_max: ByteSize.describe('Maximum amount of memory available for use by the heap.').optional(),
  heap_max_in_bytes: integer.describe('Maximum amount of memory, in bytes, available for use by the heap.'),
  java_inference: ByteSize.describe('Amount of Java heap currently being used for caching inference models.').optional(),
  java_inference_in_bytes: integer.describe('Amount of Java heap, in bytes, currently being used for caching inference models.'),
  java_inference_max: ByteSize.describe('Maximum amount of Java heap to be used for caching inference models.').optional(),
  java_inference_max_in_bytes: integer.describe('Maximum amount of Java heap, in bytes, to be used for caching inference models.')
}).meta({ id: 'MlGetMemoryStatsJvmStats' })
export type MlGetMemoryStatsJvmStats = z.infer<typeof MlGetMemoryStatsJvmStats>

export const MlGetMemoryStatsMemMlStats = z.object({
  anomaly_detectors: ByteSize.describe('Amount of native memory set aside for anomaly detection jobs.').optional(),
  anomaly_detectors_in_bytes: integer.describe('Amount of native memory, in bytes, set aside for anomaly detection jobs.'),
  data_frame_analytics: ByteSize.describe('Amount of native memory set aside for data frame analytics jobs.').optional(),
  data_frame_analytics_in_bytes: integer.describe('Amount of native memory, in bytes, set aside for data frame analytics jobs.'),
  max: ByteSize.describe('Maximum amount of native memory (separate to the JVM heap) that may be used by machine learning native processes.').optional(),
  max_in_bytes: integer.describe('Maximum amount of native memory (separate to the JVM heap), in bytes, that may be used by machine learning native processes.'),
  native_code_overhead: ByteSize.describe('Amount of native memory set aside for loading machine learning native code shared libraries.').optional(),
  native_code_overhead_in_bytes: integer.describe('Amount of native memory, in bytes, set aside for loading machine learning native code shared libraries.'),
  native_inference: ByteSize.describe('Amount of native memory set aside for trained models that have a PyTorch model_type.').optional(),
  native_inference_in_bytes: integer.describe('Amount of native memory, in bytes, set aside for trained models that have a PyTorch model_type.')
}).meta({ id: 'MlGetMemoryStatsMemMlStats' })
export type MlGetMemoryStatsMemMlStats = z.infer<typeof MlGetMemoryStatsMemMlStats>

export const MlGetMemoryStatsMemStats = z.object({
  adjusted_total: ByteSize.describe('If the amount of physical memory has been overridden using the es.total_memory_bytes system property then this reports the overridden value. Otherwise it reports the same value as total.').optional(),
  adjusted_total_in_bytes: integer.describe('If the amount of physical memory has been overridden using the `es.total_memory_bytes` system property then this reports the overridden value in bytes. Otherwise it reports the same value as `total_in_bytes`.'),
  total: ByteSize.describe('Total amount of physical memory.').optional(),
  total_in_bytes: integer.describe('Total amount of physical memory in bytes.'),
  ml: MlGetMemoryStatsMemMlStats.describe('Contains statistics about machine learning use of native memory on the node.')
}).meta({ id: 'MlGetMemoryStatsMemStats' })
export type MlGetMemoryStatsMemStats = z.infer<typeof MlGetMemoryStatsMemStats>

export const MlGetMemoryStatsMemory = z.object({
  attributes: z.record(z.string(), z.string()),
  jvm: MlGetMemoryStatsJvmStats.describe('Contains Java Virtual Machine (JVM) statistics for the node.'),
  mem: MlGetMemoryStatsMemStats.describe('Contains statistics about memory usage for the node.'),
  name: Name.describe('Human-readable identifier for the node. Based on the Node name setting setting.'),
  roles: z.array(z.string()).describe('Roles assigned to the node.'),
  transport_address: TransportAddress.describe('The host and port where transport HTTP connections are accepted.'),
  ephemeral_id: Id
}).meta({ id: 'MlGetMemoryStatsMemory' })
export type MlGetMemoryStatsMemory = z.infer<typeof MlGetMemoryStatsMemory>

/**
 * Get machine learning memory usage info.
 *
 * Get information about how machine learning jobs and trained models are using memory,
 * on each node, both within the JVM heap, and natively, outside of the JVM.
 */
export const MlGetMemoryStatsRequest = z.object({
  ...RequestBase.shape,
  node_id: Id.describe('The names of particular nodes in the cluster to target. For example, `nodeId1,nodeId2` or `ml:true`').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetMemoryStatsRequest' })
export type MlGetMemoryStatsRequest = z.infer<typeof MlGetMemoryStatsRequest>

export const MlGetMemoryStatsResponse = z.object({
  _nodes: NodeStatistics,
  cluster_name: Name,
  nodes: z.record(Id, MlGetMemoryStatsMemory)
}).meta({ id: 'MlGetMemoryStatsResponse' })
export type MlGetMemoryStatsResponse = z.infer<typeof MlGetMemoryStatsResponse>
