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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

/** A scalar value. */
export const ScalarValue = z.union([long, double, z.string(), z.boolean(), z.null()]).meta({ id: 'ScalarValue' })
export type ScalarValue = z.infer<typeof ScalarValue>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const ConnectorDependency = z.object({
  field: z.string(),
  value: ScalarValue
}).meta({ id: 'ConnectorDependency' })
export type ConnectorDependency = z.infer<typeof ConnectorDependency>

export const ConnectorDisplayType = z.enum(['textbox', 'textarea', 'numeric', 'toggle', 'dropdown']).meta({ id: 'ConnectorDisplayType' })
export type ConnectorDisplayType = z.infer<typeof ConnectorDisplayType>

export const ConnectorSelectOption = z.object({
  label: z.string(),
  value: ScalarValue
}).meta({ id: 'ConnectorSelectOption' })
export type ConnectorSelectOption = z.infer<typeof ConnectorSelectOption>

export const ConnectorConnectorFieldType = z.enum(['str', 'int', 'list', 'bool']).meta({ id: 'ConnectorConnectorFieldType' })
export type ConnectorConnectorFieldType = z.infer<typeof ConnectorConnectorFieldType>

export const ConnectorLessThanValidation = z.object({
  type: z.literal('less_than'),
  constraint: double
}).meta({ id: 'ConnectorLessThanValidation' })
export type ConnectorLessThanValidation = z.infer<typeof ConnectorLessThanValidation>

export const ConnectorGreaterThanValidation = z.object({
  type: z.literal('greater_than'),
  constraint: double
}).meta({ id: 'ConnectorGreaterThanValidation' })
export type ConnectorGreaterThanValidation = z.infer<typeof ConnectorGreaterThanValidation>

export const ConnectorListTypeValidation = z.object({
  type: z.literal('list_type'),
  constraint: z.string()
}).meta({ id: 'ConnectorListTypeValidation' })
export type ConnectorListTypeValidation = z.infer<typeof ConnectorListTypeValidation>

export const ConnectorIncludedInValidation = z.object({
  type: z.literal('included_in'),
  constraint: z.array(ScalarValue)
}).meta({ id: 'ConnectorIncludedInValidation' })
export type ConnectorIncludedInValidation = z.infer<typeof ConnectorIncludedInValidation>

export const ConnectorRegexValidation = z.object({
  type: z.literal('regex'),
  constraint: z.string()
}).meta({ id: 'ConnectorRegexValidation' })
export type ConnectorRegexValidation = z.infer<typeof ConnectorRegexValidation>

export const ConnectorValidation = z.union([ConnectorLessThanValidation, ConnectorGreaterThanValidation, ConnectorListTypeValidation, ConnectorIncludedInValidation, ConnectorRegexValidation]).meta({ id: 'ConnectorValidation' })
export type ConnectorValidation = z.infer<typeof ConnectorValidation>

export const ConnectorConnectorConfigProperties = z.object({
  category: z.string().optional(),
  default_value: ScalarValue,
  depends_on: z.array(ConnectorDependency),
  display: ConnectorDisplayType,
  label: z.string(),
  options: z.array(ConnectorSelectOption),
  order: integer.optional(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  sensitive: z.boolean(),
  tooltip: z.union([z.string(), z.null()]).optional(),
  type: ConnectorConnectorFieldType.optional(),
  ui_restrictions: z.array(z.string()).optional(),
  validations: z.array(ConnectorValidation).optional(),
  value: z.any()
}).meta({ id: 'ConnectorConnectorConfigProperties' })
export type ConnectorConnectorConfigProperties = z.infer<typeof ConnectorConnectorConfigProperties>

export const ConnectorConnectorConfiguration = z.record(z.string(), ConnectorConnectorConfigProperties).meta({ id: 'ConnectorConnectorConfiguration' })
export type ConnectorConnectorConfiguration = z.infer<typeof ConnectorConnectorConfiguration>

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

export const ConnectorIngestPipelineParams = z.object({
  extract_binary_content: z.boolean(),
  name: z.string(),
  reduce_whitespace: z.boolean(),
  run_ml_inference: z.boolean()
}).meta({ id: 'ConnectorIngestPipelineParams' })
export type ConnectorIngestPipelineParams = z.infer<typeof ConnectorIngestPipelineParams>

export const ConnectorSyncJobConnectorReference = z.object({
  configuration: ConnectorConnectorConfiguration,
  filtering: ConnectorFilteringRules,
  id: Id,
  index_name: z.string(),
  language: z.string().optional(),
  pipeline: ConnectorIngestPipelineParams.optional(),
  service_type: z.string(),
  sync_cursor: z.any().optional()
}).meta({ id: 'ConnectorSyncJobConnectorReference' })
export type ConnectorSyncJobConnectorReference = z.infer<typeof ConnectorSyncJobConnectorReference>

export const ConnectorSyncJobType = z.enum(['full', 'incremental', 'access_control']).meta({ id: 'ConnectorSyncJobType' })
export type ConnectorSyncJobType = z.infer<typeof ConnectorSyncJobType>

export const ConnectorSyncStatus = z.enum(['canceling', 'canceled', 'completed', 'error', 'in_progress', 'pending', 'suspended']).meta({ id: 'ConnectorSyncStatus' })
export type ConnectorSyncStatus = z.infer<typeof ConnectorSyncStatus>

export const ConnectorSyncJobTriggerMethod = z.enum(['on_demand', 'scheduled']).meta({ id: 'ConnectorSyncJobTriggerMethod' })
export type ConnectorSyncJobTriggerMethod = z.infer<typeof ConnectorSyncJobTriggerMethod>

export const ConnectorConnectorSyncJob = z.object({
  cancelation_requested_at: DateTime.optional(),
  canceled_at: DateTime.optional(),
  completed_at: DateTime.optional(),
  connector: ConnectorSyncJobConnectorReference,
  created_at: DateTime,
  deleted_document_count: long,
  error: z.string().optional(),
  id: Id,
  indexed_document_count: long,
  indexed_document_volume: long,
  job_type: ConnectorSyncJobType,
  last_seen: DateTime.optional(),
  metadata: z.record(z.string(), z.any()),
  started_at: DateTime.optional(),
  status: ConnectorSyncStatus,
  total_document_count: long,
  trigger_method: ConnectorSyncJobTriggerMethod,
  worker_hostname: z.string().optional()
}).meta({ id: 'ConnectorConnectorSyncJob' })
export type ConnectorConnectorSyncJob = z.infer<typeof ConnectorConnectorSyncJob>

/**
 * Get all connector sync jobs.
 *
 * Get information about all stored connector sync jobs listed by their creation date in ascending order.
 */
export const ConnectorSyncJobListRequest = z.object({
  ...RequestBase.shape,
  from: integer.describe('Starting offset').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies a max number of results to get').optional().meta({ found_in: 'query' }),
  status: ConnectorSyncStatus.describe('A sync job status to fetch connector sync jobs for').optional().meta({ found_in: 'query' }),
  connector_id: Id.describe('A connector id to fetch connector sync jobs for').optional().meta({ found_in: 'query' }),
  job_type: z.union([ConnectorSyncJobType, z.array(ConnectorSyncJobType)]).describe('A comma-separated list of job types to fetch the sync jobs for').optional().meta({ found_in: 'query' })
}).meta({ id: 'ConnectorSyncJobListRequest' })
export type ConnectorSyncJobListRequest = z.infer<typeof ConnectorSyncJobListRequest>

export const ConnectorSyncJobListResponse = z.object({
  count: long,
  results: z.array(ConnectorConnectorSyncJob)
}).meta({ id: 'ConnectorSyncJobListResponse' })
export type ConnectorSyncJobListResponse = z.infer<typeof ConnectorSyncJobListResponse>
