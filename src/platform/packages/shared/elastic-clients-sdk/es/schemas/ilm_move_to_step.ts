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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IlmMoveToStepStepKey = z.object({
  action: z.string().describe('The optional action to which the index will be moved.').optional(),
  name: z.string().describe('The optional step name to which the index will be moved.').optional(),
  phase: z.string()
}).meta({ id: 'IlmMoveToStepStepKey' })
export type IlmMoveToStepStepKey = z.infer<typeof IlmMoveToStepStepKey>

/**
 * Move to a lifecycle step.
 *
 * Manually move an index into a specific step in the lifecycle policy and run that step.
 *
 * WARNING: This operation can result in the loss of data. Manually moving an index into a specific step runs that step even if it has already been performed. This is a potentially destructive action and this should be considered an expert level API.
 *
 * You must specify both the current step and the step to be executed in the body of the request.
 * The request will fail if the current step does not match the step currently running for the index
 * This is to prevent the index from being moved from an unexpected step into the next step.
 *
 * When specifying the target (`next_step`) to which the index will be moved, either the name or both the action and name fields are optional.
 * If only the phase is specified, the index will move to the first step of the first action in the target phase.
 * If the phase and action are specified, the index will move to the first step of the specified action in the specified phase.
 * Only actions specified in the ILM policy are considered valid.
 * An index cannot move to a step that is not part of its policy.
 */
export const IlmMoveToStepRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the index whose lifecycle step is to change').meta({ found_in: 'path' }),
  current_step: IlmMoveToStepStepKey.describe('The step that the index is expected to be in.').meta({ found_in: 'body' }),
  next_step: IlmMoveToStepStepKey.describe('The step that you want to run.').meta({ found_in: 'body' })
}).meta({ id: 'IlmMoveToStepRequest' })
export type IlmMoveToStepRequest = z.infer<typeof IlmMoveToStepRequest>

export const IlmMoveToStepResponse = AcknowledgedResponseBase.meta({ id: 'IlmMoveToStepResponse' })
export type IlmMoveToStepResponse = z.infer<typeof IlmMoveToStepResponse>
