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

export const ClusterInfoTarget = z.enum(['_all', 'http', 'ingest', 'thread_pool', 'script']).meta({ id: 'ClusterInfoTarget' })
export type ClusterInfoTarget = z.infer<typeof ClusterInfoTarget>

export const ClusterInfoTargets = z.union([ClusterInfoTarget, z.array(ClusterInfoTarget)]).meta({ id: 'ClusterInfoTargets' })
export type ClusterInfoTargets = z.infer<typeof ClusterInfoTargets>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Get cluster info.
 *
 * Returns basic information about the cluster.
 */
export const ClusterInfoRequest = z.object({
  ...RequestBase.shape,
  target: ClusterInfoTargets.describe('Limits the information returned to the specific target. Supports a comma-separated list, such as http,ingest.').meta({ found_in: 'path' })
}).meta({ id: 'ClusterInfoRequest' })
export type ClusterInfoRequest = z.infer<typeof ClusterInfoRequest>

export const NodesClient = z.object({
  id: long.describe('Unique ID for the HTTP client.').optional(),
  agent: z.string().describe('Reported agent for the HTTP client. If unavailable, this property is not included in the response.').optional(),
  local_address: z.string().describe('Local address for the HTTP connection.').optional(),
  remote_address: z.string().describe('Remote address for the HTTP connection.').optional(),
  last_uri: z.string().describe('The URI of the client’s most recent request.').optional(),
  opened_time_millis: long.describe('Time at which the client opened the connection.').optional(),
  closed_time_millis: long.describe('Time at which the client closed the connection if the connection is closed.').optional(),
  last_request_time_millis: long.describe('Time of the most recent request from this client.').optional(),
  request_count: long.describe('Number of requests from this client.').optional(),
  request_size_bytes: long.describe('Cumulative size in bytes of all requests from this client.').optional(),
  x_opaque_id: z.string().describe('Value from the client’s `x-opaque-id` HTTP header. If unavailable, this property is not included in the response.').optional()
}).meta({ id: 'NodesClient' })
export type NodesClient = z.infer<typeof NodesClient>

export const NodesHttp = z.object({
  current_open: integer.describe('Current number of open HTTP connections for the node.').optional(),
  total_opened: long.describe('Total number of HTTP connections opened for the node.').optional(),
  clients: z.array(NodesClient).describe('Information on current and recently-closed HTTP client connections. Clients that have been closed longer than the `http.client_stats.closed_channels.max_age` setting will not be represented here.').optional()
}).meta({ id: 'NodesHttp' })
export type NodesHttp = z.infer<typeof NodesHttp>

export const NodesProcessor = z.object({
  count: long.describe('Number of documents transformed by the processor.').optional(),
  current: long.describe('Number of documents currently being transformed by the processor.').optional(),
  failed: long.describe('Number of failed operations for the processor.').optional(),
  time_in_millis: DurationValue.describe('Time, in milliseconds, spent by the processor transforming documents.').optional()
}).meta({ id: 'NodesProcessor' })
export type NodesProcessor = z.infer<typeof NodesProcessor>

export const NodesKeyedProcessor = z.object({
  stats: NodesProcessor.optional(),
  type: z.string().optional()
}).meta({ id: 'NodesKeyedProcessor' })
export type NodesKeyedProcessor = z.infer<typeof NodesKeyedProcessor>

export const NodesIngestStats = z.object({
  count: long.describe('Total number of documents ingested during the lifetime of this node.'),
  current: long.describe('Total number of documents currently being ingested.'),
  failed: long.describe('Total number of failed ingest operations during the lifetime of this node.'),
  processors: z.array(z.record(z.string(), NodesKeyedProcessor)).describe('Total number of ingest processors.'),
  time_in_millis: DurationValue.describe('Total time, in milliseconds, spent preprocessing ingest documents during the lifetime of this node.'),
  ingested_as_first_pipeline_in_bytes: long.describe('Total number of bytes of all documents ingested by the pipeline. This field is only present on pipelines which are the first to process a document. Thus, it is not present on pipelines which only serve as a final pipeline after a default pipeline, a pipeline run after a reroute processor, or pipelines in pipeline processors.'),
  produced_as_first_pipeline_in_bytes: long.describe('Total number of bytes of all documents produced by the pipeline. This field is only present on pipelines which are the first to process a document. Thus, it is not present on pipelines which only serve as a final pipeline after a default pipeline, a pipeline run after a reroute processor, or pipelines in pipeline processors. In situations where there are subsequent pipelines, the value represents the size of the document after all pipelines have run.')
}).meta({ id: 'NodesIngestStats' })
export type NodesIngestStats = z.infer<typeof NodesIngestStats>

export const NodesIngestTotal = z.object({
  count: long.describe('Total number of documents ingested during the lifetime of this node.'),
  current: long.describe('Total number of documents currently being ingested.'),
  failed: long.describe('Total number of failed ingest operations during the lifetime of this node.'),
  time_in_millis: DurationValue.describe('Total time, in milliseconds, spent preprocessing ingest documents during the lifetime of this node.')
}).meta({ id: 'NodesIngestTotal' })
export type NodesIngestTotal = z.infer<typeof NodesIngestTotal>

export const NodesIngest = z.object({
  pipelines: z.record(z.string(), NodesIngestStats).describe('Contains statistics about ingest pipelines for the node.').optional(),
  total: NodesIngestTotal.describe('Contains statistics about ingest operations for the node.').optional()
}).meta({ id: 'NodesIngest' })
export type NodesIngest = z.infer<typeof NodesIngest>

export const NodesThreadCount = z.object({
  active: long.describe('Number of active threads in the thread pool.').optional(),
  completed: long.describe('Number of tasks completed by the thread pool executor.').optional(),
  largest: long.describe('Highest number of active threads in the thread pool.').optional(),
  queue: long.describe('Number of tasks in queue for the thread pool.').optional(),
  rejected: long.describe('Number of tasks rejected by the thread pool executor.').optional(),
  threads: long.describe('Number of threads in the thread pool.').optional()
}).meta({ id: 'NodesThreadCount' })
export type NodesThreadCount = z.infer<typeof NodesThreadCount>

export const NodesContext = z.object({
  context: z.string().optional(),
  compilations: long.optional(),
  cache_evictions: long.optional(),
  compilation_limit_triggered: long.optional()
}).meta({ id: 'NodesContext' })
export type NodesContext = z.infer<typeof NodesContext>

export const NodesScripting = z.object({
  cache_evictions: long.describe('Total number of times the script cache has evicted old data.').optional(),
  compilations: long.describe('Total number of inline script compilations performed by the node.').optional(),
  compilations_history: z.record(z.string(), long).describe('Contains this recent history of script compilations.').optional(),
  compilation_limit_triggered: long.describe('Total number of times the script compilation circuit breaker has limited inline script compilations.').optional(),
  contexts: z.array(NodesContext).optional()
}).meta({ id: 'NodesScripting' })
export type NodesScripting = z.infer<typeof NodesScripting>

export const ClusterInfoResponse = z.object({
  cluster_name: Name,
  http: NodesHttp.optional(),
  ingest: NodesIngest.optional(),
  thread_pool: z.record(z.string(), NodesThreadCount).optional(),
  script: NodesScripting.optional()
}).meta({ id: 'ClusterInfoResponse' })
export type ClusterInfoResponse = z.infer<typeof ClusterInfoResponse>
