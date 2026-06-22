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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const ConnectorFilteringAdvancedSnippet = z.object({
  created_at: DateTime.optional(),
  updated_at: DateTime.optional(),
  value: z.any()
}).meta({ id: 'ConnectorFilteringAdvancedSnippet' })
export type ConnectorFilteringAdvancedSnippet = z.infer<typeof ConnectorFilteringAdvancedSnippet>

export const ConnectorFilteringPolicy = z.enum(['exclude', 'include']).meta({ id: 'ConnectorFilteringPolicy' })
export type ConnectorFilteringPolicy = z.infer<typeof ConnectorFilteringPolicy>

export const ConnectorFilteringRuleRule = z.enum(['contains', 'ends_with', 'equals', 'regex', 'starts_with', '>', '<']).meta({ id: 'ConnectorFilteringRuleRule' })
export type ConnectorFilteringRuleRule = z.infer<typeof ConnectorFilteringRuleRule>

export const ConnectorFilteringRule = z.object({
  created_at: DateTime.optional(),
  field: Field,
  id: Id,
  order: integer,
  policy: ConnectorFilteringPolicy,
  rule: ConnectorFilteringRuleRule,
  updated_at: DateTime.optional(),
  value: z.string()
}).meta({ id: 'ConnectorFilteringRule' })
export type ConnectorFilteringRule = z.infer<typeof ConnectorFilteringRule>

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

export const ConnectorFilteringRules = z.object({
  advanced_snippet: ConnectorFilteringAdvancedSnippet,
  rules: z.array(ConnectorFilteringRule),
  validation: ConnectorFilteringRulesValidation
}).meta({ id: 'ConnectorFilteringRules' })
export type ConnectorFilteringRules = z.infer<typeof ConnectorFilteringRules>

export const ConnectorFilteringConfig = z.object({
  active: ConnectorFilteringRules,
  domain: z.string().optional(),
  draft: ConnectorFilteringRules
}).meta({ id: 'ConnectorFilteringConfig' })
export type ConnectorFilteringConfig = z.infer<typeof ConnectorFilteringConfig>

/**
 * Update the connector filtering.
 *
 * Update the draft filtering configuration of a connector and marks the draft validation state as edited.
 * The filtering draft is activated once validated by the running Elastic connector service.
 * The filtering property is used to configure sync rules (both basic and advanced) for a connector.
 */
export const ConnectorUpdateFilteringRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated').meta({ found_in: 'path' }),
  filtering: z.array(ConnectorFilteringConfig).optional().meta({ found_in: 'body' }),
  rules: z.array(ConnectorFilteringRule).optional().meta({ found_in: 'body' }),
  advanced_snippet: ConnectorFilteringAdvancedSnippet.optional().meta({ found_in: 'body' })
}).meta({ id: 'ConnectorUpdateFilteringRequest' })
export type ConnectorUpdateFilteringRequest = z.infer<typeof ConnectorUpdateFilteringRequest>

export const ConnectorUpdateFilteringResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorUpdateFilteringResponse' })
export type ConnectorUpdateFilteringResponse = z.infer<typeof ConnectorUpdateFilteringResponse>
