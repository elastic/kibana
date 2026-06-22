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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ClusterRemoteInfoClusterRemoteSniffInfo = z.object({
  mode: z.literal('sniff').describe('The connection mode for the remote cluster.'),
  connected: z.boolean().describe('If it is `true`, there is at least one open connection to the remote cluster. If it is `false`, it means that the cluster no longer has an open connection to the remote cluster. It does not necessarily mean that the remote cluster is down or unavailable, just that at some point a connection was lost.'),
  max_connections_per_cluster: integer.describe('The maximum number of connections maintained for the remote cluster when sniff mode is configured.'),
  num_nodes_connected: long.describe('The number of connected nodes in the remote cluster when sniff mode is configured.'),
  initial_connect_timeout: Duration.describe('The initial connect timeout for remote cluster connections.'),
  skip_unavailable: z.boolean().describe('If `true`, cross-cluster search skips the remote cluster when its nodes are unavailable during the search and ignores errors returned by the remote cluster.'),
  seeds: z.array(z.string()).describe('The initial seed transport addresses of the remote cluster when sniff mode is configured.')
}).meta({ id: 'ClusterRemoteInfoClusterRemoteSniffInfo' })
export type ClusterRemoteInfoClusterRemoteSniffInfo = z.infer<typeof ClusterRemoteInfoClusterRemoteSniffInfo>

export const ClusterRemoteInfoClusterRemoteProxyInfo = z.object({
  mode: z.literal('proxy').describe('The connection mode for the remote cluster.'),
  connected: z.boolean().describe('If it is `true`, there is at least one open connection to the remote cluster. If it is `false`, it means that the cluster no longer has an open connection to the remote cluster. It does not necessarily mean that the remote cluster is down or unavailable, just that at some point a connection was lost.'),
  initial_connect_timeout: Duration.describe('The initial connect timeout for remote cluster connections.'),
  skip_unavailable: z.boolean().describe('If `true`, cross-cluster search skips the remote cluster when its nodes are unavailable during the search and ignores errors returned by the remote cluster.'),
  proxy_address: z.string().describe('The address for remote connections when proxy mode is configured.'),
  server_name: z.string(),
  num_proxy_sockets_connected: integer.describe('The number of open socket connections to the remote cluster when proxy mode is configured.'),
  max_proxy_socket_connections: integer.describe('The maximum number of socket connections to the remote cluster when proxy mode is configured.'),
  cluster_credentials: z.string().describe('This field is present and has a value of `::es_redacted::` only when the remote cluster is configured with the API key based model. Otherwise, the field is not present.').optional()
}).meta({ id: 'ClusterRemoteInfoClusterRemoteProxyInfo' })
export type ClusterRemoteInfoClusterRemoteProxyInfo = z.infer<typeof ClusterRemoteInfoClusterRemoteProxyInfo>

export const ClusterRemoteInfoClusterRemoteInfo = z.union([ClusterRemoteInfoClusterRemoteSniffInfo, ClusterRemoteInfoClusterRemoteProxyInfo]).meta({ id: 'ClusterRemoteInfoClusterRemoteInfo' })
export type ClusterRemoteInfoClusterRemoteInfo = z.infer<typeof ClusterRemoteInfoClusterRemoteInfo>

/**
 * Get remote cluster information.
 *
 * Get information about configured remote clusters.
 * The API returns connection and endpoint information keyed by the configured remote cluster alias.
 *
 * > info
 * > This API returns information that reflects current state on the local cluster.
 * > The `connected` field does not necessarily reflect whether a remote cluster is down or unavailable, only whether there is currently an open connection to it.
 * > Elasticsearch does not spontaneously try to reconnect to a disconnected remote cluster.
 * > To trigger a reconnection, attempt a cross-cluster search, ES|QL cross-cluster search, or try the [resolve cluster endpoint](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-cluster).
 */
export const ClusterRemoteInfoRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'ClusterRemoteInfoRequest' })
export type ClusterRemoteInfoRequest = z.infer<typeof ClusterRemoteInfoRequest>

export const ClusterRemoteInfoResponse = z.record(z.string(), ClusterRemoteInfoClusterRemoteInfo).meta({ id: 'ClusterRemoteInfoResponse' })
export type ClusterRemoteInfoResponse = z.infer<typeof ClusterRemoteInfoResponse>
