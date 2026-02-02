/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface AgentPolicyCreateBody {
  advanced_settings?: Record<string, any>;
  agent_features?: Array<{ enabled: boolean; name: string }>;
  agentless?: {
    cloud_connectors?: { enabled: boolean; target_csp?: string };
    resources?: { requests?: { cpu?: string; memory?: string } };
  };
  data_output_id?: string;
  description?: string;
  download_source_id?: string;
  fleet_server_host_id?: string;
  force?: boolean;
  global_data_tags?: Array<{ name: string; value: string }>;
  has_fleet_server?: boolean;
  id?: string;
  inactivity_timeout?: number;
  is_default?: boolean;
  is_default_fleet_server?: boolean;
  is_managed?: boolean;
  is_protected?: boolean;
  keep_monitoring_alive?: boolean;
  monitoring_diagnostics?: {
    limit?: { burst?: number; interval?: string };
    uploader?: { init_dur?: string; max_dur?: string; max_retries?: number };
  };
  monitoring_enabled?: string[];
  monitoring_http?: {
    buffer?: { enabled?: boolean };
    enabled?: boolean;
    host?: string;
    port?: number;
  };
  monitoring_output_id?: string;
  monitoring_pprof_enabled?: boolean;
  overrides?: Record<string, any>;
  required_versions?: Array<{ percentage?: number; version?: string }>;
  space_ids?: string[];
  supports_agentless?: boolean;
  unenroll_timeout?: number;
}

export interface FleetOutputBody {
  allow_edit?: string[];
  ca_sha256?: string;
  ca_trusted_fingerprint?: string;
  config_yaml?: string;
  id?: string;
  is_default?: boolean;
  is_default_monitoring?: boolean;
  is_internal?: boolean;
  is_preconfigured?: boolean;
  preset?: string;
  proxy_id?: string;
  secrets?: {
    ssl?: {
      key?: {
        id?: string;
      };
    };
  };
  shipper?: {
    compression_level?: number;
    disk_queue_compression_enabled?: boolean;
    disk_queue_enabled?: boolean;
    disk_queue_encryption_enabled?: boolean;
    disk_queue_max_size?: number;
    disk_queue_path?: string;
    loadbalance?: boolean;
    max_batch_bytes?: number;
    mem_queue_events?: number;
    queue_flush_timeout?: number;
  };
  ssl?: {
    certificate?: string;
    certificate_authorities?: string[];
    key?: string;
    verification_mode?: string;
  };
}

export interface FleetServerHostCreateBody {
  id?: string;
  is_default?: boolean;
  is_internal?: boolean;
  is_preconfigured?: boolean;
  proxy_id?: string;
  secrets?: {
    ssl?: {
      es_key?: {
        id?: string;
      };
      key?: {
        id?: string;
      };
    };
  };
  ssl?: {
    certificate?: string;
    certificate_authorities?: string[];
    client_auth?: string;
    es_certificate?: string;
    es_certificate_authorities?: string[];
    es_key?: string;
    key?: string;
  };
}

export interface BulkGetBody {
  full?: boolean;
  ignoreMissing?: boolean;
}

export interface AgentPolicyUpdateBody {
  advanced_settings?: Record<string, any>;
  agent_features?: Array<{ enabled: boolean; name: string }>;
  agentless?: {
    cloud_connectors?: { enabled: boolean; target_csp?: string };
    resources?: { requests?: { cpu?: string; memory?: string } };
  };
  bumpRevision?: boolean;
  data_output_id?: string;
  description?: string;
  download_source_id?: string;
  fleet_server_host_id?: string;
  force?: boolean;
  global_data_tags?: Array<{ name: string; value: string }>;
  has_fleet_server?: boolean;
  id?: string;
  inactivity_timeout?: number;
  is_default?: boolean;
  is_default_fleet_server?: boolean;
  is_managed?: boolean;
  is_protected?: boolean;
  keep_monitoring_alive?: boolean;
  monitoring_diagnostics?: {
    limit?: { burst?: number; interval?: string };
    uploader?: { init_dur?: string; max_dur?: string; max_retries?: number };
  };
  monitoring_enabled?: string[];
  monitoring_http?: {
    buffer?: { enabled?: boolean };
    enabled?: boolean;
    host?: string;
    port?: number;
  };
  monitoring_output_id?: string;
  monitoring_pprof_enabled?: boolean;
  overrides?: Record<string, any>;
  required_versions?: Array<{ percentage?: number; version?: string }>;
  space_ids?: string[];
  supports_agentless?: boolean;
  unenroll_timeout?: number;
}
