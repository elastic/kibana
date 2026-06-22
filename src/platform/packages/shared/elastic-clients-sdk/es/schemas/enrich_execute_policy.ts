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

export const TaskId = z.string().meta({ id: 'TaskId' })
export type TaskId = z.infer<typeof TaskId>

export const EnrichExecutePolicyEnrichPolicyPhase = z.enum(['SCHEDULED', 'RUNNING', 'COMPLETE', 'FAILED', 'CANCELLED']).meta({ id: 'EnrichExecutePolicyEnrichPolicyPhase' })
export type EnrichExecutePolicyEnrichPolicyPhase = z.infer<typeof EnrichExecutePolicyEnrichPolicyPhase>

export const EnrichExecutePolicyExecuteEnrichPolicyStatus = z.object({
  phase: EnrichExecutePolicyEnrichPolicyPhase,
  step: z.string().optional()
}).meta({ id: 'EnrichExecutePolicyExecuteEnrichPolicyStatus' })
export type EnrichExecutePolicyExecuteEnrichPolicyStatus = z.infer<typeof EnrichExecutePolicyExecuteEnrichPolicyStatus>

/**
 * Run an enrich policy.
 *
 * Create the enrich index for an existing enrich policy.
 */
export const EnrichExecutePolicyRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Enrich policy to execute.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request blocks other enrich policy execution requests until complete.').optional().meta({ found_in: 'query' })
}).meta({ id: 'EnrichExecutePolicyRequest' })
export type EnrichExecutePolicyRequest = z.infer<typeof EnrichExecutePolicyRequest>

export const EnrichExecutePolicyResponse = z.object({
  status: EnrichExecutePolicyExecuteEnrichPolicyStatus.optional(),
  task: TaskId.optional()
}).meta({ id: 'EnrichExecutePolicyResponse' })
export type EnrichExecutePolicyResponse = z.infer<typeof EnrichExecutePolicyResponse>
