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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SecurityClusterPrivilege = z.union([z.enum(['all', 'cancel_task', 'create_snapshot', 'cross_cluster_replication', 'cross_cluster_search', 'delegate_pki', 'grant_api_key', 'manage', 'manage_api_key', 'manage_autoscaling', 'manage_behavioral_analytics', 'manage_ccr', 'manage_data_frame_transforms', 'manage_data_stream_global_retention', 'manage_enrich', 'manage_esql', 'manage_ilm', 'manage_index_templates', 'manage_inference', 'manage_ingest_pipelines', 'manage_logstash_pipelines', 'manage_ml', 'manage_oidc', 'manage_own_api_key', 'manage_pipeline', 'manage_rollup', 'manage_saml', 'manage_search_application', 'manage_search_query_rules', 'manage_search_synonyms', 'manage_security', 'manage_service_account', 'manage_slm', 'manage_token', 'manage_transform', 'manage_user_profile', 'manage_watcher', 'monitor', 'monitor_data_frame_transforms', 'monitor_data_stream_global_retention', 'monitor_enrich', 'monitor_esql', 'monitor_inference', 'monitor_ml', 'monitor_rollup', 'monitor_snapshot', 'monitor_stats', 'monitor_text_structure', 'monitor_transform', 'monitor_watcher', 'none', 'post_behavioral_analytics_event', 'read_ccr', 'read_fleet_secrets', 'read_ilm', 'read_pipeline', 'read_security', 'read_slm', 'transport_client', 'write_connector_secrets', 'write_fleet_secrets', 'read_project_routing', 'manage_project_routing']), z.string()]).meta({ id: 'SecurityClusterPrivilege' })
export type SecurityClusterPrivilege = z.infer<typeof SecurityClusterPrivilege>

/**
 * Get builtin privileges.
 *
 * Get the list of cluster privileges and index privileges that are available in this version of Elasticsearch.
 */
export const SecurityGetBuiltinPrivilegesRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityGetBuiltinPrivilegesRequest' })
export type SecurityGetBuiltinPrivilegesRequest = z.infer<typeof SecurityGetBuiltinPrivilegesRequest>

export const SecurityGetBuiltinPrivilegesResponse = z.object({
  cluster: z.array(SecurityClusterPrivilege).describe('The list of cluster privileges that are understood by this version of Elasticsearch.'),
  index: z.array(IndexName).describe('The list of index privileges that are understood by this version of Elasticsearch.')
}).meta({ id: 'SecurityGetBuiltinPrivilegesResponse' })
export type SecurityGetBuiltinPrivilegesResponse = z.infer<typeof SecurityGetBuiltinPrivilegesResponse>
