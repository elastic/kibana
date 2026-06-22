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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

export const ConnectorFilteringValidation = z.object({
  ids: z.array(Id),
  messages: z.array(z.string())
}).meta({ id: 'ConnectorFilteringValidation' })
export type ConnectorFilteringValidation = z.infer<typeof ConnectorFilteringValidation>

export const ConnectorFilteringValidationState = z.enum(['edited', 'invalid', 'valid']).meta({ id: 'ConnectorFilteringValidationState' })
export type ConnectorFilteringValidationState = z.infer<typeof ConnectorFilteringValidationState>

export const ConnectorFilteringRulesValidation = z.object({
  errors: z.array(ConnectorFilteringValidation),
  state: ConnectorFilteringValidationState
}).meta({ id: 'ConnectorFilteringRulesValidation' })
export type ConnectorFilteringRulesValidation = z.infer<typeof ConnectorFilteringRulesValidation>

/**
 * Update the connector draft filtering validation.
 *
 * Update the draft filtering validation info for a connector.
 */
export const ConnectorUpdateFilteringValidationRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated').meta({ found_in: 'path' }),
  validation: ConnectorFilteringRulesValidation.meta({ found_in: 'body' })
}).meta({ id: 'ConnectorUpdateFilteringValidationRequest' })
export type ConnectorUpdateFilteringValidationRequest = z.infer<typeof ConnectorUpdateFilteringValidationRequest>

export const ConnectorUpdateFilteringValidationResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorUpdateFilteringValidationResponse' })
export type ConnectorUpdateFilteringValidationResponse = z.infer<typeof ConnectorUpdateFilteringValidationResponse>
