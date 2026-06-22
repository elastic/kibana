/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, RequestBase, long } from './_types'

/** This API is a diagnostics API and the output should not be relied upon for building applications. */
export const InternalDeleteDesiredBalanceRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'InternalDeleteDesiredBalanceRequest' })
export type InternalDeleteDesiredBalanceRequest = z.infer<typeof InternalDeleteDesiredBalanceRequest>

export const InternalDeleteDesiredBalanceResponse = z.boolean().meta({ id: 'InternalDeleteDesiredBalanceResponse' })
export type InternalDeleteDesiredBalanceResponse = z.infer<typeof InternalDeleteDesiredBalanceResponse>

/** Designed for indirect use by ECE/ESS and ECK, direct use is not supported. */
export const InternalDeleteDesiredNodesRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'InternalDeleteDesiredNodesRequest' })
export type InternalDeleteDesiredNodesRequest = z.infer<typeof InternalDeleteDesiredNodesRequest>

export const InternalDeleteDesiredNodesResponse = z.boolean().meta({ id: 'InternalDeleteDesiredNodesResponse' })
export type InternalDeleteDesiredNodesResponse = z.infer<typeof InternalDeleteDesiredNodesResponse>

/** This API is a diagnostics API and the output should not be relied upon for building applications. */
export const InternalGetDesiredBalanceRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'InternalGetDesiredBalanceRequest' })
export type InternalGetDesiredBalanceRequest = z.infer<typeof InternalGetDesiredBalanceRequest>

export const InternalGetDesiredBalanceResponse = z.any().meta({ id: 'InternalGetDesiredBalanceResponse' })
export type InternalGetDesiredBalanceResponse = z.infer<typeof InternalGetDesiredBalanceResponse>

/** Gets the latest desired nodes. */
export const InternalGetDesiredNodesRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'InternalGetDesiredNodesRequest' })
export type InternalGetDesiredNodesRequest = z.infer<typeof InternalGetDesiredNodesRequest>

export const InternalGetDesiredNodesResponse = z.any().meta({ id: 'InternalGetDesiredNodesResponse' })
export type InternalGetDesiredNodesResponse = z.infer<typeof InternalGetDesiredNodesResponse>

/** Prevalidates node removal from the cluster. */
export const InternalPrevalidateNodeRemovalRequest = z.object({
  ...RequestBase.shape,
  names: z.array(z.string()).describe('A comma-separated list of node names to prevalidate').optional().meta({ found_in: 'query' }),
  ids: z.array(z.string()).describe('A comma-separated list of node IDs to prevalidate').optional().meta({ found_in: 'query' }),
  external_ids: z.array(z.string()).describe('A comma-separated list of node external IDs to prevalidate').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'InternalPrevalidateNodeRemovalRequest' })
export type InternalPrevalidateNodeRemovalRequest = z.infer<typeof InternalPrevalidateNodeRemovalRequest>

export const InternalPrevalidateNodeRemovalResponse = z.any().meta({ id: 'InternalPrevalidateNodeRemovalResponse' })
export type InternalPrevalidateNodeRemovalResponse = z.infer<typeof InternalPrevalidateNodeRemovalResponse>

/** Designed for indirect use by ECE/ESS and ECK, direct use is not supported. */
export const InternalUpdateDesiredNodesRequest = z.object({
  ...RequestBase.shape,
  history_id: z.string().describe('The history ID').meta({ found_in: 'path' }),
  version: long.describe('The version number').meta({ found_in: 'path' }),
  dry_run: z.boolean().describe('Simulate the update').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  body: z.any().optional().meta({ found_in: 'body' })
}).meta({ id: 'InternalUpdateDesiredNodesRequest' })
export type InternalUpdateDesiredNodesRequest = z.infer<typeof InternalUpdateDesiredNodesRequest>

export const InternalUpdateDesiredNodesResponse = z.object({
  replaced_existing_history_id: z.boolean(),
  dry_run: z.boolean()
}).meta({ id: 'InternalUpdateDesiredNodesResponse' })
export type InternalUpdateDesiredNodesResponse = z.infer<typeof InternalUpdateDesiredNodesResponse>
