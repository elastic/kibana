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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const AutoscalingAutoscalingPolicy = z.object({
  roles: z.array(z.string()),
  deciders: z.record(z.string(), z.any()).describe('Decider settings.')
}).meta({ id: 'AutoscalingAutoscalingPolicy' })
export type AutoscalingAutoscalingPolicy = z.infer<typeof AutoscalingAutoscalingPolicy>

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
