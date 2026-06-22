/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, Id, Name, NodeStatistics, RequestBase } from './_types'

export const CapabilitiesFailedNodeException = z.object({
  node_id: Id
}).meta({ id: 'CapabilitiesFailedNodeException' })
export type CapabilitiesFailedNodeException = z.infer<typeof CapabilitiesFailedNodeException>

export const CapabilitiesRestMethod = z.enum(['GET', 'HEAD', 'POST', 'PUT', 'DELETE']).meta({ id: 'CapabilitiesRestMethod' })
export type CapabilitiesRestMethod = z.infer<typeof CapabilitiesRestMethod>

/** Checks if the specified combination of method, API, parameters, and arbitrary capabilities are supported. */
export const CapabilitiesRequest = z.object({
  ...RequestBase.shape,
  method: CapabilitiesRestMethod.describe('REST method to check').optional().meta({ found_in: 'query' }),
  path: z.string().describe('API path to check').optional().meta({ found_in: 'query' }),
  parameters: z.union([z.string(), z.array(z.string())]).describe('Comma-separated list of API parameters to check').optional().meta({ found_in: 'query' }),
  capabilities: z.union([z.string(), z.array(z.string())]).describe('Comma-separated list of arbitrary API capabilities to check').optional().meta({ found_in: 'query' }),
  local_only: z.boolean().describe('True if only the node being called should be considered').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CapabilitiesRequest' })
export type CapabilitiesRequest = z.infer<typeof CapabilitiesRequest>

export const CapabilitiesResponse = z.object({
  _nodes: NodeStatistics,
  cluster_name: Name,
  supported: z.union([z.boolean(), z.null()]),
  failures: z.array(CapabilitiesFailedNodeException).optional()
}).meta({ id: 'CapabilitiesResponse' })
export type CapabilitiesResponse = z.infer<typeof CapabilitiesResponse>
