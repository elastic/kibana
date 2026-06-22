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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

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

export const ConnectorCustomSchedulingConfigurationOverrides = z.object({
  max_crawl_depth: integer.optional(),
  sitemap_discovery_disabled: z.boolean().optional(),
  domain_allowlist: z.array(z.string()).optional(),
  sitemap_urls: z.array(z.string()).optional(),
  seed_urls: z.array(z.string()).optional()
}).meta({ id: 'ConnectorCustomSchedulingConfigurationOverrides' })
export type ConnectorCustomSchedulingConfigurationOverrides = z.infer<typeof ConnectorCustomSchedulingConfigurationOverrides>

export const ConnectorCustomScheduling = z.object({
  configuration_overrides: ConnectorCustomSchedulingConfigurationOverrides,
  enabled: z.boolean(),
  interval: z.string(),
  last_synced: DateTime.optional(),
  name: z.string()
}).meta({ id: 'ConnectorCustomScheduling' })
export type ConnectorCustomScheduling = z.infer<typeof ConnectorCustomScheduling>

export const ConnectorConnectorCustomScheduling = z.record(z.string(), ConnectorCustomScheduling).meta({ id: 'ConnectorConnectorCustomScheduling' })
export type ConnectorConnectorCustomScheduling = z.infer<typeof ConnectorConnectorCustomScheduling>

export const ConnectorFeatureEnabled = z.object({
  enabled: z.boolean()
}).meta({ id: 'ConnectorFeatureEnabled' })
export type ConnectorFeatureEnabled = z.infer<typeof ConnectorFeatureEnabled>

export const ConnectorSyncRulesFeature = z.object({
  advanced: ConnectorFeatureEnabled.describe('Indicates whether advanced sync rules are enabled.').optional(),
  basic: ConnectorFeatureEnabled.describe('Indicates whether basic sync rules are enabled.').optional()
}).meta({ id: 'ConnectorSyncRulesFeature' })
export type ConnectorSyncRulesFeature = z.infer<typeof ConnectorSyncRulesFeature>

export const ConnectorConnectorFeatures = z.object({
  document_level_security: ConnectorFeatureEnabled.describe('Indicates whether document-level security is enabled.').optional(),
  incremental_sync: ConnectorFeatureEnabled.describe('Indicates whether incremental syncs are enabled.').optional(),
  native_connector_api_keys: ConnectorFeatureEnabled.describe('Indicates whether managed connector API keys are enabled.').optional(),
  sync_rules: ConnectorSyncRulesFeature.optional()
}).meta({ id: 'ConnectorConnectorFeatures' })
export type ConnectorConnectorFeatures = z.infer<typeof ConnectorConnectorFeatures>

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

export const ConnectorSyncStatus = z.enum(['canceling', 'canceled', 'completed', 'error', 'in_progress', 'pending', 'suspended']).meta({ id: 'ConnectorSyncStatus' })
export type ConnectorSyncStatus = z.infer<typeof ConnectorSyncStatus>

export const ConnectorIngestPipelineParams = z.object({
  extract_binary_content: z.boolean(),
  name: z.string(),
  reduce_whitespace: z.boolean(),
  run_ml_inference: z.boolean()
}).meta({ id: 'ConnectorIngestPipelineParams' })
export type ConnectorIngestPipelineParams = z.infer<typeof ConnectorIngestPipelineParams>

export const ConnectorConnectorScheduling = z.object({
  enabled: z.boolean(),
  interval: z.string().describe('The interval is expressed using the crontab syntax')
}).meta({ id: 'ConnectorConnectorScheduling' })
export type ConnectorConnectorScheduling = z.infer<typeof ConnectorConnectorScheduling>

export const ConnectorSchedulingConfiguration = z.object({
  access_control: ConnectorConnectorScheduling.optional(),
  full: ConnectorConnectorScheduling.optional(),
  incremental: ConnectorConnectorScheduling.optional()
}).meta({ id: 'ConnectorSchedulingConfiguration' })
export type ConnectorSchedulingConfiguration = z.infer<typeof ConnectorSchedulingConfiguration>

export const ConnectorConnectorStatus = z.enum(['created', 'needs_configuration', 'configured', 'connected', 'error']).meta({ id: 'ConnectorConnectorStatus' })
export type ConnectorConnectorStatus = z.infer<typeof ConnectorConnectorStatus>

export const ConnectorConnector = z.object({
  api_key_id: z.string().optional(),
  api_key_secret_id: z.string().optional(),
  configuration: ConnectorConnectorConfiguration,
  custom_scheduling: ConnectorConnectorCustomScheduling,
  deleted: z.boolean(),
  description: z.string().optional(),
  error: z.union([z.string(), z.null()]).optional(),
  features: ConnectorConnectorFeatures.optional(),
  filtering: z.array(ConnectorFilteringConfig),
  id: Id.optional(),
  index_name: z.union([IndexName, z.null()]).optional(),
  is_native: z.boolean(),
  language: z.string().optional(),
  last_access_control_sync_error: z.string().optional(),
  last_access_control_sync_scheduled_at: DateTime.optional(),
  last_access_control_sync_status: ConnectorSyncStatus.optional(),
  last_deleted_document_count: long.optional(),
  last_incremental_sync_scheduled_at: DateTime.optional(),
  last_indexed_document_count: long.optional(),
  last_seen: DateTime.optional(),
  last_sync_error: z.string().optional(),
  last_sync_scheduled_at: DateTime.optional(),
  last_sync_status: ConnectorSyncStatus.optional(),
  last_synced: DateTime.optional(),
  name: z.string().optional(),
  pipeline: ConnectorIngestPipelineParams.optional(),
  scheduling: ConnectorSchedulingConfiguration,
  service_type: z.string().optional(),
  status: ConnectorConnectorStatus,
  sync_cursor: z.any().optional(),
  sync_now: z.boolean()
}).meta({ id: 'ConnectorConnector' })
export type ConnectorConnector = z.infer<typeof ConnectorConnector>

/**
 * Get all connectors.
 *
 * Get information about all connectors.
 */
export const ConnectorListRequest = z.object({
  ...RequestBase.shape,
  from: integer.describe('Starting offset').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies a max number of results to get').optional().meta({ found_in: 'query' }),
  index_name: Indices.describe('A comma-separated list of connector index names to fetch connector documents for').optional().meta({ found_in: 'query' }),
  connector_name: Names.describe('A comma-separated list of connector names to fetch connector documents for').optional().meta({ found_in: 'query' }),
  service_type: Names.describe('A comma-separated list of connector service types to fetch connector documents for').optional().meta({ found_in: 'query' }),
  include_deleted: z.boolean().describe('A flag to indicate if the desired connector should be fetched, even if it was soft-deleted.').optional().meta({ found_in: 'query' }),
  query: z.string().describe('A wildcard query string that filters connectors with matching name, description or index name').optional().meta({ found_in: 'query' })
}).meta({ id: 'ConnectorListRequest' })
export type ConnectorListRequest = z.infer<typeof ConnectorListRequest>

export const ConnectorListResponse = z.object({
  count: long,
  results: z.array(ConnectorConnector)
}).meta({ id: 'ConnectorListResponse' })
export type ConnectorListResponse = z.infer<typeof ConnectorListResponse>
