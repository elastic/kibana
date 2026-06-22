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

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SecurityClusterPrivilege = z.union([z.enum(['all', 'cancel_task', 'create_snapshot', 'cross_cluster_replication', 'cross_cluster_search', 'delegate_pki', 'grant_api_key', 'manage', 'manage_api_key', 'manage_autoscaling', 'manage_behavioral_analytics', 'manage_ccr', 'manage_data_frame_transforms', 'manage_data_stream_global_retention', 'manage_enrich', 'manage_esql', 'manage_ilm', 'manage_index_templates', 'manage_inference', 'manage_ingest_pipelines', 'manage_logstash_pipelines', 'manage_ml', 'manage_oidc', 'manage_own_api_key', 'manage_pipeline', 'manage_rollup', 'manage_saml', 'manage_search_application', 'manage_search_query_rules', 'manage_search_synonyms', 'manage_security', 'manage_service_account', 'manage_slm', 'manage_token', 'manage_transform', 'manage_user_profile', 'manage_watcher', 'monitor', 'monitor_data_frame_transforms', 'monitor_data_stream_global_retention', 'monitor_enrich', 'monitor_esql', 'monitor_inference', 'monitor_ml', 'monitor_rollup', 'monitor_snapshot', 'monitor_stats', 'monitor_text_structure', 'monitor_transform', 'monitor_watcher', 'none', 'post_behavioral_analytics_event', 'read_ccr', 'read_fleet_secrets', 'read_ilm', 'read_pipeline', 'read_security', 'read_slm', 'transport_client', 'write_connector_secrets', 'write_fleet_secrets', 'read_project_routing', 'manage_project_routing']), z.string()]).meta({ id: 'SecurityClusterPrivilege' })
export type SecurityClusterPrivilege = z.infer<typeof SecurityClusterPrivilege>

export const SecurityIndexPrivilege = z.union([z.enum(['all', 'auto_configure', 'create', 'create_doc', 'create_index', 'create_view', 'cross_cluster_replication', 'cross_cluster_replication_internal', 'delete', 'delete_index', 'delete_view', 'index', 'maintenance', 'manage', 'manage_data_stream_lifecycle', 'manage_follow_index', 'manage_ilm', 'manage_leader_index', 'manage_view', 'monitor', 'none', 'read', 'read_cross_cluster', 'read_view_metadata', 'view_index_metadata', 'write']), z.string()]).meta({ id: 'SecurityIndexPrivilege' })
export type SecurityIndexPrivilege = z.infer<typeof SecurityIndexPrivilege>

export const SecurityUserProfileId = z.string().meta({ id: 'SecurityUserProfileId' })
export type SecurityUserProfileId = z.infer<typeof SecurityUserProfileId>

export const SecurityHasPrivilegesApplicationPrivilegesCheck = z.object({
  application: z.string().describe('The name of the application.'),
  privileges: z.array(z.string()).describe('A list of the privileges that you want to check for the specified resources. It may be either application privilege names or the names of actions that are granted by those privileges'),
  resources: z.array(z.string()).describe('A list of resource names against which the privileges should be checked.')
}).meta({ id: 'SecurityHasPrivilegesApplicationPrivilegesCheck' })
export type SecurityHasPrivilegesApplicationPrivilegesCheck = z.infer<typeof SecurityHasPrivilegesApplicationPrivilegesCheck>

export const SecurityHasPrivilegesIndexPrivilegesCheck = z.object({
  names: Indices.describe('A list of indices.'),
  privileges: z.array(SecurityIndexPrivilege).describe('A list of the privileges that you want to check for the specified indices.'),
  allow_restricted_indices: z.boolean().describe('This needs to be set to `true` (default is `false`) if using wildcards or regexps for patterns that cover restricted indices. Implicitly, restricted indices do not match index patterns because restricted indices usually have limited privileges and including them in pattern tests would render most such tests false. If restricted indices are explicitly included in the names list, privileges will be checked against them regardless of the value of `allow_restricted_indices`.').optional()
}).meta({ id: 'SecurityHasPrivilegesIndexPrivilegesCheck' })
export type SecurityHasPrivilegesIndexPrivilegesCheck = z.infer<typeof SecurityHasPrivilegesIndexPrivilegesCheck>

export const SecurityHasPrivilegesUserProfileHasPrivilegesUserProfileErrors = z.object({
  count: long,
  details: z.record(SecurityUserProfileId, z.lazy(() => ErrorCause))
}).meta({ id: 'SecurityHasPrivilegesUserProfileHasPrivilegesUserProfileErrors' })
export type SecurityHasPrivilegesUserProfileHasPrivilegesUserProfileErrors = z.infer<typeof SecurityHasPrivilegesUserProfileHasPrivilegesUserProfileErrors>

export const SecurityHasPrivilegesUserProfilePrivilegesCheck = z.object({
  application: z.array(SecurityHasPrivilegesApplicationPrivilegesCheck).optional(),
  cluster: z.array(SecurityClusterPrivilege).describe('A list of the cluster privileges that you want to check.').optional(),
  index: z.array(SecurityHasPrivilegesIndexPrivilegesCheck).optional()
}).meta({ id: 'SecurityHasPrivilegesUserProfilePrivilegesCheck' })
export type SecurityHasPrivilegesUserProfilePrivilegesCheck = z.infer<typeof SecurityHasPrivilegesUserProfilePrivilegesCheck>

/**
 * Check user profile privileges.
 *
 * Determine whether the users associated with the specified user profile IDs have all the requested privileges.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions. Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 */
export const SecurityHasPrivilegesUserProfileRequest = z.object({
  ...RequestBase.shape,
  uids: z.array(SecurityUserProfileId).describe('A list of profile IDs. The privileges are checked for associated users of the profiles.').meta({ found_in: 'body' }),
  privileges: SecurityHasPrivilegesUserProfilePrivilegesCheck.describe('An object containing all the privileges to be checked.').meta({ found_in: 'body' })
}).meta({ id: 'SecurityHasPrivilegesUserProfileRequest' })
export type SecurityHasPrivilegesUserProfileRequest = z.infer<typeof SecurityHasPrivilegesUserProfileRequest>

export const SecurityHasPrivilegesUserProfileResponse = z.object({
  has_privilege_uids: z.array(SecurityUserProfileId).describe('The subset of the requested profile IDs of the users that have all the requested privileges.'),
  errors: SecurityHasPrivilegesUserProfileHasPrivilegesUserProfileErrors.describe('The subset of the requested profile IDs for which an error was encountered. It does not include the missing profile IDs or the profile IDs of the users that do not have all the requested privileges. This field is absent if empty.').optional()
}).meta({ id: 'SecurityHasPrivilegesUserProfileResponse' })
export type SecurityHasPrivilegesUserProfileResponse = z.infer<typeof SecurityHasPrivilegesUserProfileResponse>
