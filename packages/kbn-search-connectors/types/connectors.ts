/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConnectorIndex, ElasticsearchViewIndexExtension } from './indices';
export interface SelectOption {
  label: string;
  value: string;
}

export interface Dependency {
  field: string;
  value: string | number | boolean | null;
}

export type DependencyLookup = Record<string, string | number | boolean | null>;

export enum DisplayType {
  TEXTBOX = 'textbox',
  TEXTAREA = 'textarea',
  NUMERIC = 'numeric',
  TOGGLE = 'toggle',
  DROPDOWN = 'dropdown',
}

export enum FieldType {
  STRING = 'str',
  INTEGER = 'int',
  LIST = 'list',
  BOOLEAN = 'bool',
}

export interface ConnectorConfigCategoryProperties {
  label: string;
  order: number;
  type: 'category';
}

export interface Validation {
  constraint: string | number;
  type: string;
}

export interface ConnectorConfigProperties {
  category?: string;
  default_value: string | number | boolean | null;
  depends_on: Dependency[];
  display: DisplayType;
  label: string;
  options: SelectOption[];
  order?: number | null;
  placeholder?: string;
  required: boolean;
  sensitive: boolean;
  tooltip: string | null;
  type: FieldType;
  ui_restrictions: string[];
  validations: Validation[];
  value: string | number | boolean | null;
}

export type ConnectorConfiguration = Record<
  string,
  ConnectorConfigProperties | ConnectorConfigCategoryProperties | null
> & {
  extract_full_html?: { label: string; value: boolean }; // This only exists for Crawler
  use_document_level_security?: ConnectorConfigProperties;
  use_text_extraction_service?: ConnectorConfigProperties;
};

export interface ConnectorScheduling {
  enabled: boolean;
  interval: string; // interval has crontab syntax
}

export interface CustomScheduling {
  configuration_overrides: Record<string, unknown>;
  enabled: boolean;
  interval: string;
  last_synced: string | null;
  name: string;
}

export type ConnectorCustomScheduling = Record<string, CustomScheduling | null>;

export enum ConnectorStatus {
  CREATED = 'created',
  NEEDS_CONFIGURATION = 'needs_configuration',
  CONFIGURED = 'configured',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export enum SyncStatus {
  CANCELING = 'canceling',
  CANCELED = 'canceled',
  COMPLETED = 'completed',
  ERROR = 'error',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export interface IngestPipelineParams {
  extract_binary_content: boolean;
  name: string;
  reduce_whitespace: boolean;
  run_ml_inference: boolean;
}

export type FilteringPolicy = 'exclude' | 'include';

export type FilteringRuleRule =
  | 'contains'
  | 'ends_with'
  | 'equals'
  | '>'
  | '<'
  | 'regex'
  | 'starts_with';

export const FilteringRuleRuleValues: FilteringRuleRule[] = [
  'contains',
  'ends_with',
  'equals',
  '>',
  '<',
  'regex',
  'starts_with',
];

export interface FilteringRule {
  created_at: string;
  field: string;
  id: string;
  order: number;
  policy: FilteringPolicy;
  rule: FilteringRuleRule;
  updated_at: string;
  value: string;
}

export interface FilteringValidation {
  ids: string[];
  messages: string[];
}

export enum FilteringValidationState {
  EDITED = 'edited',
  INVALID = 'invalid',
  VALID = 'valid',
}

export interface FilteringRules {
  advanced_snippet: {
    created_at: string;
    updated_at: string;
    value: Record<string, unknown>;
  };
  rules: FilteringRule[];
  validation: {
    errors: FilteringValidation[];
    state: FilteringValidationState;
  };
}

export interface FilteringConfig {
  active: FilteringRules;
  domain: string;
  draft: FilteringRules;
}

export enum TriggerMethod {
  ON_DEMAND = 'on_demand',
  SCHEDULED = 'scheduled',
}

export enum SyncJobType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  ACCESS_CONTROL = 'access_control',
}

export enum FeatureName {
  FILTERING_ADVANCED_CONFIG = 'filtering_advanced_config',
  FILTERING_RULES = 'filtering_rules',
  DOCUMENT_LEVEL_SECURITY = 'document_level_security',
  INCREMENTAL_SYNC = 'incremental_sync',
  SYNC_RULES = 'sync_rules',
}

export type ConnectorFeatures = Partial<{
  [FeatureName.DOCUMENT_LEVEL_SECURITY]: { enabled: boolean };
  [FeatureName.FILTERING_ADVANCED_CONFIG]: boolean;
  [FeatureName.FILTERING_RULES]: boolean;
  [FeatureName.INCREMENTAL_SYNC]: { enabled: boolean };
  [FeatureName.SYNC_RULES]: {
    advanced?: {
      enabled: boolean;
    };
    basic?: {
      enabled: boolean;
    };
  };
}> | null;

export interface SchedulingConfiguraton {
  access_control: ConnectorScheduling;
  full: ConnectorScheduling;
  incremental: ConnectorScheduling;
}

export interface Connector {
  api_key_id: string | null;
  api_key_secret_id: string | null;
  configuration: ConnectorConfiguration;
  custom_scheduling: ConnectorCustomScheduling;
  description: string | null;
  error: string | null;
  features: ConnectorFeatures;
  filtering: FilteringConfig[];
  id: string;
  index_name: string | null;
  is_native: boolean;
  language: string | null;
  last_access_control_sync_error: string | null;
  last_access_control_sync_scheduled_at: string | null;
  last_access_control_sync_status: SyncStatus | null;
  last_deleted_document_count: number | null;
  last_incremental_sync_scheduled_at: string | null;
  last_indexed_document_count: number | null;
  last_seen: string | null;
  last_sync_error: string | null;
  last_sync_scheduled_at: string | null;
  last_sync_status: SyncStatus | null;
  last_synced: string | null;
  name: string;
  pipeline?: IngestPipelineParams | null;
  scheduling: SchedulingConfiguraton;
  service_type: string | null;
  status: ConnectorStatus;
  sync_now: boolean;
}

export type ConnectorDocument = Omit<Connector, 'id'>;

export interface ConnectorSyncJob {
  cancelation_requested_at: string | null;
  canceled_at: string | null;
  completed_at: string | null;
  connector: {
    configuration: ConnectorConfiguration;
    filtering: FilteringRules | FilteringRules[] | null;
    id: string;
    index_name: string;
    language: string | null;
    pipeline: IngestPipelineParams | null;
    service_type: string | null;
  };
  created_at: string;
  deleted_document_count: number;
  error: string | null;
  id: string;
  indexed_document_count: number;
  indexed_document_volume: number;
  job_type: SyncJobType;
  last_seen: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  status: SyncStatus;
  total_document_count: number | null;
  trigger_method: TriggerMethod;
  worker_hostname: string | null;
}

export type ConnectorSyncJobDocument = Omit<ConnectorSyncJob, 'id'>;

export interface NativeConnector {
  configuration: ConnectorConfiguration;
  features: Connector['features'];
  name: string;
  serviceType: string;
}

export type ConnectorViewIndex = ConnectorIndex & ElasticsearchViewIndexExtension;
