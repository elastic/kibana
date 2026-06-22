/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Duration, Name, NodeName, RequestBase, integer } from './_types'

export const AutoscalingAutoscalingPolicy = z.object({
  roles: z.array(z.string()),
  deciders: z.record(z.string(), z.any()).describe('Decider settings.')
}).meta({ id: 'AutoscalingAutoscalingPolicy' })
export type AutoscalingAutoscalingPolicy = z.infer<typeof AutoscalingAutoscalingPolicy>

/**
 * Delete an autoscaling policy.
 *
 * NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.
 */
export const AutoscalingDeleteAutoscalingPolicyRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of the autoscaling policy').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'AutoscalingDeleteAutoscalingPolicyRequest' })
export type AutoscalingDeleteAutoscalingPolicyRequest = z.infer<typeof AutoscalingDeleteAutoscalingPolicyRequest>

export const AutoscalingDeleteAutoscalingPolicyResponse = AcknowledgedResponseBase.meta({ id: 'AutoscalingDeleteAutoscalingPolicyResponse' })
export type AutoscalingDeleteAutoscalingPolicyResponse = z.infer<typeof AutoscalingDeleteAutoscalingPolicyResponse>

export const AutoscalingGetAutoscalingCapacityAutoscalingResources = z.object({
  storage: integer,
  memory: integer
}).meta({ id: 'AutoscalingGetAutoscalingCapacityAutoscalingResources' })
export type AutoscalingGetAutoscalingCapacityAutoscalingResources = z.infer<typeof AutoscalingGetAutoscalingCapacityAutoscalingResources>

export const AutoscalingGetAutoscalingCapacityAutoscalingCapacity = z.object({
  node: AutoscalingGetAutoscalingCapacityAutoscalingResources,
  total: AutoscalingGetAutoscalingCapacityAutoscalingResources
}).meta({ id: 'AutoscalingGetAutoscalingCapacityAutoscalingCapacity' })
export type AutoscalingGetAutoscalingCapacityAutoscalingCapacity = z.infer<typeof AutoscalingGetAutoscalingCapacityAutoscalingCapacity>

export const AutoscalingGetAutoscalingCapacityAutoscalingDecider = z.object({
  required_capacity: AutoscalingGetAutoscalingCapacityAutoscalingCapacity,
  reason_summary: z.string().optional(),
  reason_details: z.any().optional()
}).meta({ id: 'AutoscalingGetAutoscalingCapacityAutoscalingDecider' })
export type AutoscalingGetAutoscalingCapacityAutoscalingDecider = z.infer<typeof AutoscalingGetAutoscalingCapacityAutoscalingDecider>

export const AutoscalingGetAutoscalingCapacityAutoscalingNode = z.object({
  name: NodeName
}).meta({ id: 'AutoscalingGetAutoscalingCapacityAutoscalingNode' })
export type AutoscalingGetAutoscalingCapacityAutoscalingNode = z.infer<typeof AutoscalingGetAutoscalingCapacityAutoscalingNode>

export const AutoscalingGetAutoscalingCapacityAutoscalingDeciders = z.object({
  required_capacity: AutoscalingGetAutoscalingCapacityAutoscalingCapacity,
  current_capacity: AutoscalingGetAutoscalingCapacityAutoscalingCapacity,
  current_nodes: z.array(AutoscalingGetAutoscalingCapacityAutoscalingNode),
  deciders: z.record(z.string(), AutoscalingGetAutoscalingCapacityAutoscalingDecider)
}).meta({ id: 'AutoscalingGetAutoscalingCapacityAutoscalingDeciders' })
export type AutoscalingGetAutoscalingCapacityAutoscalingDeciders = z.infer<typeof AutoscalingGetAutoscalingCapacityAutoscalingDeciders>

/**
 * Get the autoscaling capacity.
 *
 * NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.
 *
 * This API gets the current autoscaling capacity based on the configured autoscaling policy.
 * It will return information to size the cluster appropriately to the current workload.
 *
 * The `required_capacity` is calculated as the maximum of the `required_capacity` result of all individual deciders that are enabled for the policy.
 *
 * The operator should verify that the `current_nodes` match the operator’s knowledge of the cluster to avoid making autoscaling decisions based on stale or incomplete information.
 *
 * The response contains decider-specific information you can use to diagnose how and why autoscaling determined a certain capacity was required.
 * This information is provided for diagnosis only.
 * Do not use this information to make autoscaling decisions.
 */
export const AutoscalingGetAutoscalingCapacityRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'AutoscalingGetAutoscalingCapacityRequest' })
export type AutoscalingGetAutoscalingCapacityRequest = z.infer<typeof AutoscalingGetAutoscalingCapacityRequest>

export const AutoscalingGetAutoscalingCapacityResponse = z.object({
  policies: z.record(z.string(), AutoscalingGetAutoscalingCapacityAutoscalingDeciders)
}).meta({ id: 'AutoscalingGetAutoscalingCapacityResponse' })
export type AutoscalingGetAutoscalingCapacityResponse = z.infer<typeof AutoscalingGetAutoscalingCapacityResponse>

/**
 * Get an autoscaling policy.
 *
 * NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.
 */
export const AutoscalingGetAutoscalingPolicyRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of the autoscaling policy').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'AutoscalingGetAutoscalingPolicyRequest' })
export type AutoscalingGetAutoscalingPolicyRequest = z.infer<typeof AutoscalingGetAutoscalingPolicyRequest>

export const AutoscalingGetAutoscalingPolicyResponse = AutoscalingAutoscalingPolicy.meta({ id: 'AutoscalingGetAutoscalingPolicyResponse' })
export type AutoscalingGetAutoscalingPolicyResponse = z.infer<typeof AutoscalingGetAutoscalingPolicyResponse>

/**
 * Create or update an autoscaling policy.
 *
 * NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.
 */
export const AutoscalingPutAutoscalingPolicyRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of the autoscaling policy').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  policy: AutoscalingAutoscalingPolicy.optional().meta({ found_in: 'body' })
}).meta({ id: 'AutoscalingPutAutoscalingPolicyRequest' })
export type AutoscalingPutAutoscalingPolicyRequest = z.infer<typeof AutoscalingPutAutoscalingPolicyRequest>

export const AutoscalingPutAutoscalingPolicyResponse = AcknowledgedResponseBase.meta({ id: 'AutoscalingPutAutoscalingPolicyResponse' })
export type AutoscalingPutAutoscalingPolicyResponse = z.infer<typeof AutoscalingPutAutoscalingPolicyResponse>
