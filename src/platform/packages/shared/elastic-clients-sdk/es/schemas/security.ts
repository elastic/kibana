/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script } from './_global.search'
import { AcknowledgedResponseBase, AggregateName, Duration, DurationLarge, DurationValue, EpochTime, ErrorCause, Field, FieldValue, Fields, Id, Ids, IndexName, Indices, Metadata, Name, Names, Namespace, NodeStatistics, Password, Refresh, RelationName, RequestBase, ScriptLanguage, SequenceNumber, Service, SortResults, Username, integer, long } from './_types'
import { AggregationsBucketAggregationBase, AggregationsBuckets, AggregationsCardinalityAggregate, AggregationsCardinalityAggregation, AggregationsCompositeAggregate, AggregationsCompositeAggregation, AggregationsDateRangeAggregate, AggregationsDateRangeAggregation, AggregationsDoubleTermsAggregate, AggregationsFilterAggregate, AggregationsFiltersAggregate, AggregationsLongTermsAggregate, AggregationsMissingAggregate, AggregationsMissingAggregation, AggregationsMultiTermsAggregate, AggregationsRangeAggregate, AggregationsRangeAggregation, AggregationsStringTermsAggregate, AggregationsTermsAggregation, AggregationsUnmappedTermsAggregate, AggregationsValueCountAggregate, AggregationsValueCountAggregation } from './_types.aggregations'
import { QueryDslBoolQuery, QueryDslExistsQuery, QueryDslIdsQuery, QueryDslMatchAllQuery, QueryDslMatchQuery, QueryDslPrefixQuery, QueryDslQueryContainer, QueryDslRangeQuery, QueryDslSimpleQueryStringQuery, QueryDslTermQuery, QueryDslTermsQuery, QueryDslWildcardQuery, Sort } from './_types.query_dsl'
import { IndicesIndexSettings } from './indices'
import { XpackUsageSecurityRolesDls } from './xpack'

export const SecurityReplicationAccess = z.object({
  names: z.union([IndexName, z.array(IndexName)]).describe('A list of indices (or index name patterns) to which the permissions in this entry apply.'),
  allow_restricted_indices: z.boolean().describe('This needs to be set to true if the patterns in the names field should cover system indices.').optional()
}).meta({ id: 'SecurityReplicationAccess' })
export type SecurityReplicationAccess = z.infer<typeof SecurityReplicationAccess>

export const SecurityFieldSecurity = z.object({
  except: Fields.optional(),
  grant: Fields.optional()
}).meta({ id: 'SecurityFieldSecurity' })
export type SecurityFieldSecurity = z.infer<typeof SecurityFieldSecurity>

export const SecurityRoleTemplateInlineQuery = z.union([z.string(), z.lazy(() => QueryDslQueryContainer)]).meta({ id: 'SecurityRoleTemplateInlineQuery' })
export type SecurityRoleTemplateInlineQuery = z.infer<typeof SecurityRoleTemplateInlineQuery>

export const SecurityRoleTemplateScript = z.object({
  source: SecurityRoleTemplateInlineQuery.optional(),
  id: Id.describe('The `id` for a stored script.').optional(),
  params: z.record(z.string(), z.any()).describe('Specifies any named parameters that are passed into the script as variables. Use parameters instead of hard-coded values to decrease compile time.').optional(),
  lang: ScriptLanguage.describe('Specifies the language the script is written in.').optional(),
  options: z.record(z.string(), z.string()).optional()
}).meta({ id: 'SecurityRoleTemplateScript' })
export type SecurityRoleTemplateScript = z.infer<typeof SecurityRoleTemplateScript>

export const SecurityRoleTemplateQuery = z.object({
  template: SecurityRoleTemplateScript.describe('When you create a role, you can specify a query that defines the document level security permissions. You can optionally use Mustache templates in the role query to insert the username of the current authenticated user into the role. Like other places in Elasticsearch that support templating or scripting, you can specify inline, stored, or file-based templates and define custom parameters. You access the details for the current authenticated user through the _user parameter.').optional()
}).meta({ id: 'SecurityRoleTemplateQuery' })
export type SecurityRoleTemplateQuery = z.infer<typeof SecurityRoleTemplateQuery>

/**
 * While creating or updating a role you can provide either a JSON structure or a string to the API.
 * However, the response provided by Elasticsearch will only be string with a json-as-text content.
 *
 * Since this is embedded in `IndicesPrivileges`, the same structure is used for clarity in both contexts.
 */
export const SecurityIndicesPrivilegesQuery = z.union([z.string(), z.lazy(() => QueryDslQueryContainer), SecurityRoleTemplateQuery]).meta({ id: 'SecurityIndicesPrivilegesQuery' })
export type SecurityIndicesPrivilegesQuery = z.infer<typeof SecurityIndicesPrivilegesQuery>

export const SecuritySearchAccess = z.object({
  field_security: SecurityFieldSecurity.describe('The document fields that the owners of the role have read access to.').optional(),
  names: z.union([IndexName, z.array(IndexName)]).describe('A list of indices (or index name patterns) to which the permissions in this entry apply.'),
  query: SecurityIndicesPrivilegesQuery.describe('A search query that defines the documents the owners of the role have access to. A document within the specified indices must match this query for it to be accessible by the owners of the role.').optional()
}).meta({ id: 'SecuritySearchAccess' })
export type SecuritySearchAccess = z.infer<typeof SecuritySearchAccess>

export const SecurityAccess = z.object({
  replication: z.array(SecurityReplicationAccess).describe('A list of indices permission entries for cross-cluster replication.').optional(),
  search: z.array(SecuritySearchAccess).describe('A list of indices permission entries for cross-cluster search.').optional()
}).meta({ id: 'SecurityAccess' })
export type SecurityAccess = z.infer<typeof SecurityAccess>

export const SecurityApiKeyType = z.enum(['rest', 'cross_cluster']).meta({ id: 'SecurityApiKeyType' })
export type SecurityApiKeyType = z.infer<typeof SecurityApiKeyType>

export const SecurityClusterPrivilege = z.union([z.enum(['all', 'cancel_task', 'create_snapshot', 'cross_cluster_replication', 'cross_cluster_search', 'delegate_pki', 'grant_api_key', 'manage', 'manage_api_key', 'manage_autoscaling', 'manage_behavioral_analytics', 'manage_ccr', 'manage_data_frame_transforms', 'manage_data_stream_global_retention', 'manage_enrich', 'manage_esql', 'manage_ilm', 'manage_index_templates', 'manage_inference', 'manage_ingest_pipelines', 'manage_logstash_pipelines', 'manage_ml', 'manage_oidc', 'manage_own_api_key', 'manage_pipeline', 'manage_rollup', 'manage_saml', 'manage_search_application', 'manage_search_query_rules', 'manage_search_synonyms', 'manage_security', 'manage_service_account', 'manage_slm', 'manage_token', 'manage_transform', 'manage_user_profile', 'manage_watcher', 'monitor', 'monitor_data_frame_transforms', 'monitor_data_stream_global_retention', 'monitor_enrich', 'monitor_esql', 'monitor_inference', 'monitor_ml', 'monitor_rollup', 'monitor_snapshot', 'monitor_stats', 'monitor_text_structure', 'monitor_transform', 'monitor_watcher', 'none', 'post_behavioral_analytics_event', 'read_ccr', 'read_fleet_secrets', 'read_ilm', 'read_pipeline', 'read_security', 'read_slm', 'transport_client', 'write_connector_secrets', 'write_fleet_secrets', 'read_project_routing', 'manage_project_routing']), z.string()]).meta({ id: 'SecurityClusterPrivilege' })
export type SecurityClusterPrivilege = z.infer<typeof SecurityClusterPrivilege>

export const SecurityIndexPrivilege = z.union([z.enum(['all', 'auto_configure', 'create', 'create_doc', 'create_index', 'create_view', 'cross_cluster_replication', 'cross_cluster_replication_internal', 'delete', 'delete_index', 'delete_view', 'index', 'maintenance', 'manage', 'manage_data_stream_lifecycle', 'manage_follow_index', 'manage_ilm', 'manage_leader_index', 'manage_view', 'monitor', 'none', 'read', 'read_cross_cluster', 'read_view_metadata', 'view_index_metadata', 'write']), z.string()]).meta({ id: 'SecurityIndexPrivilege' })
export type SecurityIndexPrivilege = z.infer<typeof SecurityIndexPrivilege>

export const SecurityIndicesPrivileges = z.object({
  field_security: SecurityFieldSecurity.describe('The document fields that the owners of the role have read access to.').optional(),
  names: z.union([IndexName, z.array(IndexName)]).describe('A list of indices (or index name patterns) to which the permissions in this entry apply.'),
  privileges: z.array(SecurityIndexPrivilege).describe('The index level privileges that owners of the role have on the specified indices.'),
  query: SecurityIndicesPrivilegesQuery.describe('A search query that defines the documents the owners of the role have access to. A document within the specified indices must match this query for it to be accessible by the owners of the role.').optional()
}).meta({ id: 'SecurityIndicesPrivileges' })
export type SecurityIndicesPrivileges = z.infer<typeof SecurityIndicesPrivileges>

/** The subset of index level privileges that can be defined for remote clusters. */
export const SecurityRemoteIndicesPrivileges = z.object({
  clusters: Names.describe('A list of cluster aliases to which the permissions in this entry apply.'),
  field_security: SecurityFieldSecurity.describe('The document fields that the owners of the role have read access to.').optional(),
  names: z.union([IndexName, z.array(IndexName)]).describe('A list of indices (or index name patterns) to which the permissions in this entry apply.'),
  privileges: z.array(SecurityIndexPrivilege).describe('The index level privileges that owners of the role have on the specified indices.'),
  query: SecurityIndicesPrivilegesQuery.describe('A search query that defines the documents the owners of the role have access to. A document within the specified indices must match this query for it to be accessible by the owners of the role.').optional()
}).meta({ id: 'SecurityRemoteIndicesPrivileges' })
export type SecurityRemoteIndicesPrivileges = z.infer<typeof SecurityRemoteIndicesPrivileges>

export const SecurityRemoteClusterPrivilege = z.enum(['monitor_enrich', 'monitor_stats']).meta({ id: 'SecurityRemoteClusterPrivilege' })
export type SecurityRemoteClusterPrivilege = z.infer<typeof SecurityRemoteClusterPrivilege>

/** The subset of cluster level privileges that can be defined for remote clusters. */
export const SecurityRemoteClusterPrivileges = z.object({
  clusters: Names.describe('A list of cluster aliases to which the permissions in this entry apply.'),
  privileges: z.array(SecurityRemoteClusterPrivilege).describe('The cluster level privileges that owners of the role have on the remote cluster.')
}).meta({ id: 'SecurityRemoteClusterPrivileges' })
export type SecurityRemoteClusterPrivileges = z.infer<typeof SecurityRemoteClusterPrivileges>

export const SecurityManageUserPrivileges = z.object({
  applications: z.array(z.string())
}).meta({ id: 'SecurityManageUserPrivileges' })
export type SecurityManageUserPrivileges = z.infer<typeof SecurityManageUserPrivileges>

export const SecurityApplicationGlobalUserPrivileges = z.object({
  manage: SecurityManageUserPrivileges
}).meta({ id: 'SecurityApplicationGlobalUserPrivileges' })
export type SecurityApplicationGlobalUserPrivileges = z.infer<typeof SecurityApplicationGlobalUserPrivileges>

export const SecurityGlobalPrivilege = z.object({
  application: SecurityApplicationGlobalUserPrivileges
}).meta({ id: 'SecurityGlobalPrivilege' })
export type SecurityGlobalPrivilege = z.infer<typeof SecurityGlobalPrivilege>

export const SecurityApplicationPrivileges = z.object({
  application: z.string().describe('The name of the application to which this entry applies.'),
  privileges: z.array(z.string()).describe('A list of strings, where each element is the name of an application privilege or action.'),
  resources: z.array(z.string()).describe('A list resources to which the privileges are applied.')
}).meta({ id: 'SecurityApplicationPrivileges' })
export type SecurityApplicationPrivileges = z.infer<typeof SecurityApplicationPrivileges>

export const SecurityRestrictionWorkflow = z.union([z.enum(['search_application_query']), z.string()]).meta({ id: 'SecurityRestrictionWorkflow' })
export type SecurityRestrictionWorkflow = z.infer<typeof SecurityRestrictionWorkflow>

export const SecurityRestriction = z.object({
  workflows: z.array(SecurityRestrictionWorkflow).describe('A list of workflows to which the API key is restricted. NOTE: In order to use a role restriction, an API key must be created with a single role descriptor.')
}).meta({ id: 'SecurityRestriction' })
export type SecurityRestriction = z.infer<typeof SecurityRestriction>

export const SecurityRoleDescriptor = z.object({
  cluster: z.array(SecurityClusterPrivilege).describe('A list of cluster privileges. These privileges define the cluster level actions that API keys are able to execute.').optional(),
  indices: z.array(SecurityIndicesPrivileges).describe('A list of indices permissions entries.').optional(),
  index: z.array(SecurityIndicesPrivileges).describe('A list of indices permissions entries.').optional(),
  applications: z.array(SecurityApplicationPrivileges).describe('A list of application privilege entries').optional(),
  metadata: Metadata.describe('Optional meta-data. Within the metadata object, keys that begin with `_` are reserved for system usage.').optional(),
  run_as: z.array(z.string()).describe('A list of users that the API keys can impersonate. NOTE: In Elastic Cloud Serverless, the run-as feature is disabled. For API compatibility, you can still specify an empty `run_as` field, but a non-empty list will be rejected.').optional(),
  description: z.string().describe('Optional description of the role descriptor').optional(),
  restriction: SecurityRestriction.describe('Restriction for when the role descriptor is allowed to be effective.').optional(),
  transient_metadata: z.record(z.string(), z.any()).optional()
}).meta({ id: 'SecurityRoleDescriptor' })
export type SecurityRoleDescriptor = z.infer<typeof SecurityRoleDescriptor>

export const SecurityApiKey = z.object({
  id: Id.describe('Id for the API key'),
  name: Name.describe('Name of the API key.'),
  type: SecurityApiKeyType.describe('The type of the API key (e.g. `rest` or `cross_cluster`).'),
  creation: EpochTime.describe('Creation time for the API key in milliseconds.'),
  expiration: EpochTime.describe('Expiration time for the API key in milliseconds.').optional(),
  invalidated: z.boolean().describe('Invalidation status for the API key. If the key has been invalidated, it has a value of `true`. Otherwise, it is `false`.'),
  invalidation: EpochTime.describe('If the key has been invalidated, invalidation time in milliseconds.').optional(),
  username: Username.describe('Principal for which this API key was created'),
  realm: z.string().describe('Realm name of the principal for which this API key was created.'),
  realm_type: z.string().describe('Realm type of the principal for which this API key was created').optional(),
  metadata: Metadata.describe('Metadata of the API key'),
  role_descriptors: z.record(z.string(), SecurityRoleDescriptor).describe('The role descriptors assigned to this API key when it was created or last updated. An empty role descriptor means the API key inherits the owner user’s permissions.').optional(),
  limited_by: z.array(z.record(z.string(), SecurityRoleDescriptor)).describe('The owner user’s permissions associated with the API key. It is a point-in-time snapshot captured at creation and subsequent updates. An API key’s effective permissions are an intersection of its assigned privileges and the owner user’s permissions.').optional(),
  access: SecurityAccess.describe('The access granted to cross-cluster API keys. The access is composed of permissions for cross cluster search and cross cluster replication. At least one of them must be specified. When specified, the new access assignment fully replaces the previously assigned access.').optional(),
  profile_uid: z.string().describe('The profile uid for the API key owner principal, if requested and if it exists').optional(),
  _sort: SortResults.describe('Sorting values when using the `sort` parameter with the `security.query_api_keys` API.').optional()
}).meta({ id: 'SecurityApiKey' })
export type SecurityApiKey = z.infer<typeof SecurityApiKey>

export const SecurityBulkError = z.object({
  count: integer.describe('The number of errors'),
  details: z.record(z.string(), z.lazy(() => ErrorCause)).describe('Details about the errors, keyed by role name')
}).meta({ id: 'SecurityBulkError' })
export type SecurityBulkError = z.infer<typeof SecurityBulkError>

export const SecurityClusterNode = z.object({
  name: Name
}).meta({ id: 'SecurityClusterNode' })
export type SecurityClusterNode = z.infer<typeof SecurityClusterNode>

export const SecurityCreatedStatus = z.object({
  created: z.boolean()
}).meta({ id: 'SecurityCreatedStatus' })
export type SecurityCreatedStatus = z.infer<typeof SecurityCreatedStatus>

export const SecurityCredentialManagedBy = z.enum(['cloud', 'elasticsearch']).meta({ id: 'SecurityCredentialManagedBy' })
export type SecurityCredentialManagedBy = z.infer<typeof SecurityCredentialManagedBy>

export const SecurityGrantType = z.enum(['password', 'access_token']).meta({ id: 'SecurityGrantType' })
export type SecurityGrantType = z.infer<typeof SecurityGrantType>

export const SecurityIndicesPrivilegesBase = z.object({
  field_security: SecurityFieldSecurity.describe('The document fields that the owners of the role have read access to.').optional(),
  names: z.union([IndexName, z.array(IndexName)]).describe('A list of indices (or index name patterns) to which the permissions in this entry apply.'),
  privileges: z.array(SecurityIndexPrivilege).describe('The index level privileges that owners of the role have on the specified indices.'),
  query: SecurityIndicesPrivilegesQuery.describe('A search query that defines the documents the owners of the role have access to. A document within the specified indices must match this query for it to be accessible by the owners of the role.').optional()
}).meta({ id: 'SecurityIndicesPrivilegesBase' })
export type SecurityIndicesPrivilegesBase = z.infer<typeof SecurityIndicesPrivilegesBase>

export const SecurityRolesStats = z.object({
  dls: XpackUsageSecurityRolesDls.describe('Document-level security (DLS) statistics.')
}).meta({ id: 'SecurityRolesStats' })
export type SecurityRolesStats = z.infer<typeof SecurityRolesStats>

export const SecurityNodeSecurityStats = z.object({
  roles: SecurityRolesStats.describe('Role statistics.')
}).meta({ id: 'SecurityNodeSecurityStats' })
export type SecurityNodeSecurityStats = z.infer<typeof SecurityNodeSecurityStats>

export const SecurityRealmInfo = z.object({
  name: Name,
  type: z.string()
}).meta({ id: 'SecurityRealmInfo' })
export type SecurityRealmInfo = z.infer<typeof SecurityRealmInfo>

export const SecurityRemoteUserIndicesPrivileges = z.object({
  clusters: z.array(z.string()),
  field_security: z.array(SecurityFieldSecurity).describe('The document fields that the owners of the role have read access to.').optional(),
  names: z.union([IndexName, z.array(IndexName)]).describe('A list of indices (or index name patterns) to which the permissions in this entry apply.'),
  privileges: z.array(SecurityIndexPrivilege).describe('The index level privileges that owners of the role have on the specified indices.'),
  query: z.array(SecurityIndicesPrivilegesQuery).describe('Search queries that define the documents the user has access to. A document within the specified indices must match these queries for it to be accessible by the owners of the role.').optional(),
  allow_restricted_indices: z.boolean().describe('Set to `true` if using wildcard or regular expressions for patterns that cover restricted indices. Implicitly, restricted indices have limited privileges that can cause pattern tests to fail. If restricted indices are explicitly included in the `names` list, Elasticsearch checks privileges against these indices regardless of the value set for `allow_restricted_indices`.')
}).meta({ id: 'SecurityRemoteUserIndicesPrivileges' })
export type SecurityRemoteUserIndicesPrivileges = z.infer<typeof SecurityRemoteUserIndicesPrivileges>

export const SecurityRoleDescriptorRead = z.object({
  cluster: z.array(SecurityClusterPrivilege).describe('A list of cluster privileges. These privileges define the cluster level actions that API keys are able to execute.'),
  indices: z.array(SecurityIndicesPrivileges).describe('A list of indices permissions entries.'),
  index: z.array(SecurityIndicesPrivileges).describe('A list of indices permissions entries.'),
  applications: z.array(SecurityApplicationPrivileges).describe('A list of application privilege entries').optional(),
  metadata: Metadata.describe('Optional meta-data. Within the metadata object, keys that begin with `_` are reserved for system usage.').optional(),
  run_as: z.array(z.string()).describe('A list of users that the API keys can impersonate. NOTE: In Elastic Cloud Serverless, the run-as feature is disabled. For API compatibility, you can still specify an empty `run_as` field, but a non-empty list will be rejected.').optional(),
  description: z.string().describe('Optional description of the role descriptor').optional(),
  restriction: SecurityRestriction.describe('Restriction for when the role descriptor is allowed to be effective.').optional(),
  transient_metadata: z.record(z.string(), z.any()).optional()
}).meta({ id: 'SecurityRoleDescriptorRead' })
export type SecurityRoleDescriptorRead = z.infer<typeof SecurityRoleDescriptorRead>

export const SecurityTemplateFormat = z.enum(['string', 'json']).meta({ id: 'SecurityTemplateFormat' })
export type SecurityTemplateFormat = z.infer<typeof SecurityTemplateFormat>

export const SecurityRoleTemplate = z.object({
  format: SecurityTemplateFormat.optional(),
  template: z.lazy(() => Script)
}).meta({ id: 'SecurityRoleTemplate' })
export type SecurityRoleTemplate = z.infer<typeof SecurityRoleTemplate>

const SecurityRoleMappingRuleExclusiveProps = z.union([z.object({ any: z.array(z.lazy(() => SecurityRoleMappingRule)) }), z.object({ all: z.array(z.lazy(() => SecurityRoleMappingRule)) }), z.object({ field: z.record(Field, z.union([FieldValue, z.array(FieldValue)])) }), z.object({ except: z.lazy(() => SecurityRoleMappingRule) })])

export interface SecurityRoleMappingRuleShape {
  any?: SecurityRoleMappingRule[] | undefined
  all?: SecurityRoleMappingRule[] | undefined
  field?: Record<Field, FieldValue | FieldValue[]> | undefined
  except?: SecurityRoleMappingRule | undefined
}
export const SecurityRoleMappingRule: z.ZodType<SecurityRoleMappingRuleShape> = SecurityRoleMappingRuleExclusiveProps.meta({ id: 'SecurityRoleMappingRule' })
export type SecurityRoleMappingRule = z.infer<typeof SecurityRoleMappingRule>

export const SecurityRoleMapping = z.object({
  enabled: z.boolean(),
  metadata: Metadata,
  roles: z.array(z.string()).optional(),
  role_templates: z.array(SecurityRoleTemplate).optional(),
  rules: z.lazy(() => SecurityRoleMappingRule)
}).meta({ id: 'SecurityRoleMapping' })
export type SecurityRoleMapping = z.infer<typeof SecurityRoleMapping>

export const SecuritySecuritySettings = z.object({
  index: z.lazy(() => IndicesIndexSettings).optional()
}).meta({ id: 'SecuritySecuritySettings' })
export type SecuritySecuritySettings = z.infer<typeof SecuritySecuritySettings>

export const SecurityUserProfileId = z.string().meta({ id: 'SecurityUserProfileId' })
export type SecurityUserProfileId = z.infer<typeof SecurityUserProfileId>

export const SecurityUser = z.object({
  email: z.union([z.string(), z.null()]).optional(),
  full_name: z.union([Name, z.null()]).optional(),
  metadata: Metadata,
  roles: z.array(z.string()),
  username: Username,
  enabled: z.boolean(),
  profile_uid: SecurityUserProfileId.optional()
}).meta({ id: 'SecurityUser' })
export type SecurityUser = z.infer<typeof SecurityUser>

export const SecurityUserIndicesPrivileges = z.object({
  field_security: z.array(SecurityFieldSecurity).describe('The document fields that the owners of the role have read access to.').optional(),
  names: z.union([IndexName, z.array(IndexName)]).describe('A list of indices (or index name patterns) to which the permissions in this entry apply.'),
  privileges: z.array(SecurityIndexPrivilege).describe('The index level privileges that owners of the role have on the specified indices.'),
  query: z.array(SecurityIndicesPrivilegesQuery).describe('Search queries that define the documents the user has access to. A document within the specified indices must match these queries for it to be accessible by the owners of the role.').optional(),
  allow_restricted_indices: z.boolean().describe('Set to `true` if using wildcard or regular expressions for patterns that cover restricted indices. Implicitly, restricted indices have limited privileges that can cause pattern tests to fail. If restricted indices are explicitly included in the `names` list, Elasticsearch checks privileges against these indices regardless of the value set for `allow_restricted_indices`.')
}).meta({ id: 'SecurityUserIndicesPrivileges' })
export type SecurityUserIndicesPrivileges = z.infer<typeof SecurityUserIndicesPrivileges>

export const SecurityUserIndicesPrivilegesBase = z.object({
  field_security: z.array(SecurityFieldSecurity).describe('The document fields that the owners of the role have read access to.').optional(),
  names: z.union([IndexName, z.array(IndexName)]).describe('A list of indices (or index name patterns) to which the permissions in this entry apply.'),
  privileges: z.array(SecurityIndexPrivilege).describe('The index level privileges that owners of the role have on the specified indices.'),
  query: z.array(SecurityIndicesPrivilegesQuery).describe('Search queries that define the documents the user has access to. A document within the specified indices must match these queries for it to be accessible by the owners of the role.').optional(),
  allow_restricted_indices: z.boolean().describe('Set to `true` if using wildcard or regular expressions for patterns that cover restricted indices. Implicitly, restricted indices have limited privileges that can cause pattern tests to fail. If restricted indices are explicitly included in the `names` list, Elasticsearch checks privileges against these indices regardless of the value set for `allow_restricted_indices`.')
}).meta({ id: 'SecurityUserIndicesPrivilegesBase' })
export type SecurityUserIndicesPrivilegesBase = z.infer<typeof SecurityUserIndicesPrivilegesBase>

export const SecurityUserProfileUser = z.object({
  email: z.union([z.string(), z.null()]).optional(),
  full_name: z.union([Name, z.null()]).optional(),
  realm_name: Name,
  realm_domain: Name.optional(),
  roles: z.array(z.string()),
  username: Username
}).meta({ id: 'SecurityUserProfileUser' })
export type SecurityUserProfileUser = z.infer<typeof SecurityUserProfileUser>

export const SecurityUserProfile = z.object({
  uid: SecurityUserProfileId,
  user: SecurityUserProfileUser,
  data: z.record(z.string(), z.any()),
  labels: z.record(z.string(), z.any()),
  enabled: z.boolean().optional()
}).meta({ id: 'SecurityUserProfile' })
export type SecurityUserProfile = z.infer<typeof SecurityUserProfile>

export const SecurityUserProfileHitMetadata = z.object({
  _primary_term: long,
  _seq_no: SequenceNumber
}).meta({ id: 'SecurityUserProfileHitMetadata' })
export type SecurityUserProfileHitMetadata = z.infer<typeof SecurityUserProfileHitMetadata>

export const SecurityUserProfileWithMetadata = z.object({
  ...SecurityUserProfile.shape,
  last_synchronized: long,
  _doc: SecurityUserProfileHitMetadata
}).meta({ id: 'SecurityUserProfileWithMetadata' })
export type SecurityUserProfileWithMetadata = z.infer<typeof SecurityUserProfileWithMetadata>

/**
 * Activate a user profile.
 *
 * Create or update a user profile on behalf of another user.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * The calling application must have either an `access_token` or a combination of `username` and `password` for the user that the profile document is intended for.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 *
 * This API creates or updates a profile document for end users with information that is extracted from the user's authentication object including `username`, `full_name,` `roles`, and the authentication realm.
 * For example, in the JWT `access_token` case, the profile user's `username` is extracted from the JWT token claim pointed to by the `claims.principal` setting of the JWT realm that authenticated the token.
 *
 * When updating a profile document, the API enables the document if it was disabled.
 * Any updates do not change existing content for either the `labels` or `data` fields.
 */
export const SecurityActivateUserProfileRequest = z.object({
  ...RequestBase.shape,
  access_token: z.string().describe('The user\'s Elasticsearch access token or JWT. Both `access` and `id` JWT token types are supported and they depend on the underlying JWT realm configuration. If you specify the `access_token` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' }),
  grant_type: SecurityGrantType.describe('The type of grant.').meta({ found_in: 'body' }),
  password: z.string().describe('The user\'s password. If you specify the `password` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' }),
  username: z.string().describe('The username that identifies the user. If you specify the `password` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityActivateUserProfileRequest' })
export type SecurityActivateUserProfileRequest = z.infer<typeof SecurityActivateUserProfileRequest>

export const SecurityActivateUserProfileResponse = SecurityUserProfileWithMetadata.meta({ id: 'SecurityActivateUserProfileResponse' })
export type SecurityActivateUserProfileResponse = z.infer<typeof SecurityActivateUserProfileResponse>

export const SecurityAuthenticateAuthenticateApiKey = z.object({
  id: Id,
  name: Name.optional(),
  managed_by: SecurityCredentialManagedBy,
  internal: z.boolean().optional()
}).meta({ id: 'SecurityAuthenticateAuthenticateApiKey' })
export type SecurityAuthenticateAuthenticateApiKey = z.infer<typeof SecurityAuthenticateAuthenticateApiKey>

/**
 * Authenticate a user.
 *
 * Authenticates a user and returns information about the authenticated user.
 * Include the user information in a [basic auth header](https://en.wikipedia.org/wiki/Basic_access_authentication).
 * A successful call returns a JSON structure that shows user information such as their username, the roles that are assigned to the user, any assigned metadata, and information about the realms that authenticated and authorized the user.
 * If the user cannot be authenticated, this API returns a 401 status code.
 */
export const SecurityAuthenticateRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityAuthenticateRequest' })
export type SecurityAuthenticateRequest = z.infer<typeof SecurityAuthenticateRequest>

export const SecurityAuthenticateToken = z.object({
  name: Name.optional(),
  type: z.string().optional(),
  managed_by: SecurityCredentialManagedBy.optional()
}).meta({ id: 'SecurityAuthenticateToken' })
export type SecurityAuthenticateToken = z.infer<typeof SecurityAuthenticateToken>

export const SecurityAuthenticateResponse = z.object({
  api_key: SecurityAuthenticateAuthenticateApiKey.optional(),
  authentication_realm: SecurityRealmInfo,
  email: z.union([z.string(), z.null()]).optional(),
  full_name: z.union([Name, z.null()]).optional(),
  lookup_realm: SecurityRealmInfo,
  metadata: Metadata,
  roles: z.array(z.string()),
  username: Username,
  enabled: z.boolean(),
  authentication_type: z.string(),
  token: SecurityAuthenticateToken.optional()
}).meta({ id: 'SecurityAuthenticateResponse' })
export type SecurityAuthenticateResponse = z.infer<typeof SecurityAuthenticateResponse>

/**
 * Bulk delete roles.
 *
 * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
 * The bulk delete roles API cannot delete roles that are defined in roles files.
 */
export const SecurityBulkDeleteRoleRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  names: z.array(z.string()).describe('An array of role names to delete').meta({ found_in: 'body' })
}).meta({ id: 'SecurityBulkDeleteRoleRequest' })
export type SecurityBulkDeleteRoleRequest = z.infer<typeof SecurityBulkDeleteRoleRequest>

export const SecurityBulkDeleteRoleResponse = z.object({
  deleted: z.array(z.string()).describe('Array of deleted roles').optional(),
  not_found: z.array(z.string()).describe('Array of roles that could not be found').optional(),
  errors: SecurityBulkError.describe('Present if any deletes resulted in errors').optional()
}).meta({ id: 'SecurityBulkDeleteRoleResponse' })
export type SecurityBulkDeleteRoleResponse = z.infer<typeof SecurityBulkDeleteRoleResponse>

/**
 * Bulk create or update roles.
 *
 * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
 * The bulk create or update roles API cannot update roles that are defined in roles files.
 */
export const SecurityBulkPutRoleRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  roles: z.record(z.string(), SecurityRoleDescriptor).describe('A dictionary of role name to RoleDescriptor objects to add or update').meta({ found_in: 'body' })
}).meta({ id: 'SecurityBulkPutRoleRequest' })
export type SecurityBulkPutRoleRequest = z.infer<typeof SecurityBulkPutRoleRequest>

export const SecurityBulkPutRoleResponse = z.object({
  created: z.array(z.string()).describe('Array of created roles').optional(),
  updated: z.array(z.string()).describe('Array of updated roles').optional(),
  noop: z.array(z.string()).describe('Array of role names without any changes').optional(),
  errors: SecurityBulkError.describe('Present if any updates resulted in errors').optional()
}).meta({ id: 'SecurityBulkPutRoleResponse' })
export type SecurityBulkPutRoleResponse = z.infer<typeof SecurityBulkPutRoleResponse>

/**
 * Bulk update API keys.
 *
 * Update the attributes for multiple API keys.
 *
 * IMPORTANT: It is not possible to use an API key as the authentication credential for this API. To update API keys, the owner user's credentials are required.
 *
 * This API is similar to the update API key API but enables you to apply the same update to multiple API keys in one API call. This operation can greatly improve performance over making individual updates.
 *
 * It is not possible to update expired or invalidated API keys.
 *
 * This API supports updates to API key access scope, metadata and expiration.
 * The access scope of each API key is derived from the `role_descriptors` you specify in the request and a snapshot of the owner user's permissions at the time of the request.
 * The snapshot of the owner's permissions is updated automatically on every call.
 *
 * IMPORTANT: If you don't specify `role_descriptors` in the request, a call to this API might still change an API key's access scope. This change can occur if the owner user's permissions have changed since the API key was created or last modified.
 *
 * A successful request returns a JSON structure that contains the IDs of all updated API keys, the IDs of API keys that already had the requested changes and did not require an update, and error details for any failed update.
 */
export const SecurityBulkUpdateApiKeysRequest = z.object({
  ...RequestBase.shape,
  expiration: Duration.describe('Expiration time for the API keys. By default, API keys never expire. This property can be omitted to leave the value unchanged.').optional().meta({ found_in: 'body' }),
  ids: z.union([z.string(), z.array(z.string())]).describe('The API key identifiers.').meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary nested metadata to associate with the API keys. Within the `metadata` object, top-level keys beginning with an underscore (`_`) are reserved for system usage. Any information specified with this parameter fully replaces metadata previously associated with the API key.').optional().meta({ found_in: 'body' }),
  role_descriptors: z.record(z.string(), SecurityRoleDescriptor).describe('The role descriptors to assign to the API keys. An API key\'s effective permissions are an intersection of its assigned privileges and the point-in-time snapshot of permissions of the owner user. You can assign new privileges by specifying them in this parameter. To remove assigned privileges, supply the `role_descriptors` parameter as an empty object `{}`. If an API key has no assigned privileges, it inherits the owner user\'s full permissions. The snapshot of the owner\'s permissions is always updated, whether you supply the `role_descriptors` parameter. The structure of a role descriptor is the same as the request for the create API keys API.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityBulkUpdateApiKeysRequest' })
export type SecurityBulkUpdateApiKeysRequest = z.infer<typeof SecurityBulkUpdateApiKeysRequest>

export const SecurityBulkUpdateApiKeysResponse = z.object({
  errors: SecurityBulkError.optional(),
  noops: z.array(z.string()),
  updated: z.array(z.string())
}).meta({ id: 'SecurityBulkUpdateApiKeysResponse' })
export type SecurityBulkUpdateApiKeysResponse = z.infer<typeof SecurityBulkUpdateApiKeysResponse>

/**
 * Change passwords.
 *
 * Change the passwords of users in the native realm and built-in users.
 */
export const SecurityChangePasswordRequest = z.object({
  ...RequestBase.shape,
  username: Username.describe('The user whose password you want to change. If you do not specify this parameter, the password is changed for the current user.').optional().meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  password: Password.describe('The new password value. Passwords must be at least 6 characters long.').optional().meta({ found_in: 'body' }),
  password_hash: z.string().describe('A hash of the new password value. This must be produced using the same hashing algorithm as has been configured for password storage. For more details, see the explanation of the `xpack.security.authc.password_hashing.algorithm` setting.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityChangePasswordRequest' })
export type SecurityChangePasswordRequest = z.infer<typeof SecurityChangePasswordRequest>

export const SecurityChangePasswordResponse = z.object({
}).meta({ id: 'SecurityChangePasswordResponse' })
export type SecurityChangePasswordResponse = z.infer<typeof SecurityChangePasswordResponse>

/**
 * Clear the API key cache.
 *
 * Evict a subset of all entries from the API key cache.
 * The cache is also automatically cleared on state changes of the security index.
 */
export const SecurityClearApiKeyCacheRequest = z.object({
  ...RequestBase.shape,
  ids: Ids.describe('Comma-separated list of API key IDs to evict from the API key cache. To evict all API keys, use `*`. Does not support other wildcard patterns.').meta({ found_in: 'path' })
}).meta({ id: 'SecurityClearApiKeyCacheRequest' })
export type SecurityClearApiKeyCacheRequest = z.infer<typeof SecurityClearApiKeyCacheRequest>

export const SecurityClearApiKeyCacheResponse = z.object({
  node_stats: NodeStatistics,
  cluster_name: Name,
  nodes: z.record(z.string(), SecurityClusterNode)
}).meta({ id: 'SecurityClearApiKeyCacheResponse' })
export type SecurityClearApiKeyCacheResponse = z.infer<typeof SecurityClearApiKeyCacheResponse>

/**
 * Clear the privileges cache.
 *
 * Evict privileges from the native application privilege cache.
 * The cache is also automatically cleared for applications that have their privileges updated.
 */
export const SecurityClearCachedPrivilegesRequest = z.object({
  ...RequestBase.shape,
  application: Names.describe('A comma-separated list of applications. To clear all applications, use an asterism (`*`). It does not support other wildcard patterns.').meta({ found_in: 'path' })
}).meta({ id: 'SecurityClearCachedPrivilegesRequest' })
export type SecurityClearCachedPrivilegesRequest = z.infer<typeof SecurityClearCachedPrivilegesRequest>

export const SecurityClearCachedPrivilegesResponse = z.object({
  node_stats: NodeStatistics,
  cluster_name: Name,
  nodes: z.record(z.string(), SecurityClusterNode)
}).meta({ id: 'SecurityClearCachedPrivilegesResponse' })
export type SecurityClearCachedPrivilegesResponse = z.infer<typeof SecurityClearCachedPrivilegesResponse>

/**
 * Clear the user cache.
 *
 * Evict users from the user cache.
 * You can completely clear the cache or evict specific users.
 *
 * User credentials are cached in memory on each node to avoid connecting to a remote authentication service or hitting the disk for every incoming request.
 * There are realm settings that you can use to configure the user cache.
 * For more information, refer to the documentation about controlling the user cache.
 */
export const SecurityClearCachedRealmsRequest = z.object({
  ...RequestBase.shape,
  realms: Names.describe('A comma-separated list of realms. To clear all realms, use an asterisk (`*`). It does not support other wildcard patterns.').meta({ found_in: 'path' }),
  usernames: z.array(z.string()).describe('A comma-separated list of the users to clear from the cache. If you do not specify this parameter, the API evicts all users from the user cache.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityClearCachedRealmsRequest' })
export type SecurityClearCachedRealmsRequest = z.infer<typeof SecurityClearCachedRealmsRequest>

export const SecurityClearCachedRealmsResponse = z.object({
  node_stats: NodeStatistics,
  cluster_name: Name,
  nodes: z.record(z.string(), SecurityClusterNode)
}).meta({ id: 'SecurityClearCachedRealmsResponse' })
export type SecurityClearCachedRealmsResponse = z.infer<typeof SecurityClearCachedRealmsResponse>

/**
 * Clear the roles cache.
 *
 * Evict roles from the native role cache.
 */
export const SecurityClearCachedRolesRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('A comma-separated list of roles to evict from the role cache. To evict all roles, use an asterisk (`*`). It does not support other wildcard patterns.').meta({ found_in: 'path' })
}).meta({ id: 'SecurityClearCachedRolesRequest' })
export type SecurityClearCachedRolesRequest = z.infer<typeof SecurityClearCachedRolesRequest>

export const SecurityClearCachedRolesResponse = z.object({
  node_stats: NodeStatistics,
  cluster_name: Name,
  nodes: z.record(z.string(), SecurityClusterNode)
}).meta({ id: 'SecurityClearCachedRolesResponse' })
export type SecurityClearCachedRolesResponse = z.infer<typeof SecurityClearCachedRolesResponse>

/**
 * Clear service account token caches.
 *
 * Evict a subset of all entries from the service account token caches.
 * Two separate caches exist for service account tokens: one cache for tokens backed by the `service_tokens` file, and another for tokens backed by the `.security` index.
 * This API clears matching entries from both caches.
 *
 * The cache for service account tokens backed by the `.security` index is cleared automatically on state changes of the security index.
 * The cache for tokens backed by the `service_tokens` file is cleared automatically on file changes.
 */
export const SecurityClearCachedServiceTokensRequest = z.object({
  ...RequestBase.shape,
  namespace: Namespace.describe('The namespace, which is a top-level grouping of service accounts.').meta({ found_in: 'path' }),
  service: Service.describe('The name of the service, which must be unique within its namespace.').meta({ found_in: 'path' }),
  name: Names.describe('A comma-separated list of token names to evict from the service account token caches. Use a wildcard (`*`) to evict all tokens that belong to a service account. It does not support other wildcard patterns.').meta({ found_in: 'path' })
}).meta({ id: 'SecurityClearCachedServiceTokensRequest' })
export type SecurityClearCachedServiceTokensRequest = z.infer<typeof SecurityClearCachedServiceTokensRequest>

export const SecurityClearCachedServiceTokensResponse = z.object({
  node_stats: NodeStatistics,
  cluster_name: Name,
  nodes: z.record(z.string(), SecurityClusterNode)
}).meta({ id: 'SecurityClearCachedServiceTokensResponse' })
export type SecurityClearCachedServiceTokensResponse = z.infer<typeof SecurityClearCachedServiceTokensResponse>

/**
 * Clone an API key.
 *
 * Create a copy of an existing API key with a new ID.
 * The cloned key inherits the role descriptors of the source key.
 * This is intended for applications (such as Kibana) that need to
 * create API keys on behalf of a user using an existing API key credential,
 * since derived API keys (API keys created by API keys) are not otherwise supported.
 */
export const SecurityCloneApiKeyRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  api_key: z.string().describe('The credentials of the API key to clone. This is the secret value returned when the key was originally created.').meta({ found_in: 'body' }),
  name: Name.describe('A name for the cloned API key. If not provided, the name of the source key is used.').optional().meta({ found_in: 'body' }),
  expiration: Duration.describe('The expiration time for the cloned API key. By default, API keys never expire. Set to `null` to explicitly create a key with no expiration.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata to associate with the cloned API key. It supports nested data structure. Within the metadata object, keys beginning with `_` are reserved for system usage.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityCloneApiKeyRequest' })
export type SecurityCloneApiKeyRequest = z.infer<typeof SecurityCloneApiKeyRequest>

export const SecurityCloneApiKeyResponse = z.object({
  api_key: z.string().describe('The generated API key value for the cloned key.'),
  expiration: long.describe('Expiration in milliseconds for the API key.').optional(),
  id: Id.describe('The unique ID of the cloned API key.'),
  name: Name.describe('The name of the cloned API key.'),
  encoded: z.string().describe('API key credentials which is the base64-encoding of the UTF-8 representation of `id` and `api_key` joined by a colon (`:`).')
}).meta({ id: 'SecurityCloneApiKeyResponse' })
export type SecurityCloneApiKeyResponse = z.infer<typeof SecurityCloneApiKeyResponse>

/**
 * Create an API key.
 *
 * Create an API key for access without requiring basic authentication.
 *
 * IMPORTANT: If the credential that is used to authenticate this request is an API key, the derived API key cannot have any privileges.
 * If you specify privileges, the API returns an error.
 *
 * A successful request returns a JSON structure that contains the API key, its unique id, and its name.
 * If applicable, it also returns expiration information for the API key in milliseconds.
 *
 * NOTE: By default, API keys never expire. You can specify expiration information when you create the API keys.
 *
 * The API keys are created by the Elasticsearch API key service, which is automatically enabled.
 * To configure or turn off the API key service, refer to API key service setting documentation.
 */
export const SecurityCreateApiKeyRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  expiration: Duration.describe('The expiration time for the API key. By default, API keys never expire.').optional().meta({ found_in: 'body' }),
  name: Name.describe('A name for the API key.').optional().meta({ found_in: 'body' }),
  role_descriptors: z.record(z.string(), SecurityRoleDescriptor).describe('An array of role descriptors for this API key. When it is not specified or it is an empty array, the API key will have a point in time snapshot of permissions of the authenticated user. If you supply role descriptors, the resultant permissions are an intersection of API keys permissions and the authenticated user\'s permissions thereby limiting the access scope for API keys. The structure of role descriptor is the same as the request for the create role API. For more details, refer to the create or update roles API. NOTE: Due to the way in which this permission intersection is calculated, it is not possible to create an API key that is a child of another API key, unless the derived key is created without any privileges. In this case, you must explicitly specify a role descriptor with no privileges. The derived API key can be used for authentication; it will not have authority to call Elasticsearch APIs.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata that you want to associate with the API key. It supports nested data structure. Within the metadata object, keys beginning with `_` are reserved for system usage.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityCreateApiKeyRequest' })
export type SecurityCreateApiKeyRequest = z.infer<typeof SecurityCreateApiKeyRequest>

export const SecurityCreateApiKeyResponse = z.object({
  api_key: z.string().describe('Generated API key.'),
  expiration: long.describe('Expiration in milliseconds for the API key.').optional(),
  id: Id.describe('Unique ID for this API key.'),
  name: Name.describe('Specifies the name for this API key.'),
  encoded: z.string().describe('API key credentials which is the base64-encoding of the UTF-8 representation of `id` and `api_key` joined by a colon (`:`).')
}).meta({ id: 'SecurityCreateApiKeyResponse' })
export type SecurityCreateApiKeyResponse = z.infer<typeof SecurityCreateApiKeyResponse>

/**
 * Create a cross-cluster API key.
 *
 * Create an API key of the `cross_cluster` type for the API key based remote cluster access.
 * A `cross_cluster` API key cannot be used to authenticate through the REST interface.
 *
 * IMPORTANT: To authenticate this request you must use a credential that is not an API key. Even if you use an API key that has the required privilege, the API returns an error.
 *
 * Cross-cluster API keys are created by the Elasticsearch API key service, which is automatically enabled.
 *
 * NOTE: Unlike REST API keys, a cross-cluster API key does not capture permissions of the authenticated user. The API key’s effective permission is exactly as specified with the `access` property.
 *
 * A successful request returns a JSON structure that contains the API key, its unique ID, and its name. If applicable, it also returns expiration information for the API key in milliseconds.
 *
 * By default, API keys never expire. You can specify expiration information when you create the API keys.
 *
 * Cross-cluster API keys can only be updated with the update cross-cluster API key API.
 * Attempting to update them with the update REST API key API or the bulk update REST API keys API will result in an error.
 */
export const SecurityCreateCrossClusterApiKeyRequest = z.object({
  ...RequestBase.shape,
  access: SecurityAccess.describe('The access to be granted to this API key. The access is composed of permissions for cross-cluster search and cross-cluster replication. At least one of them must be specified. NOTE: No explicit privileges should be specified for either search or replication access. The creation process automatically converts the access specification to a role descriptor which has relevant privileges assigned accordingly.').meta({ found_in: 'body' }),
  expiration: Duration.describe('Expiration time for the API key. By default, API keys never expire.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata that you want to associate with the API key. It supports nested data structure. Within the metadata object, keys beginning with `_` are reserved for system usage.').optional().meta({ found_in: 'body' }),
  name: Name.describe('Specifies the name for this API key.').meta({ found_in: 'body' }),
  certificate_identity: z.string().describe('The certificate identity to associate with this API key. This field is used to restrict the API key to connections authenticated by a specific TLS certificate. The value should match the certificate\'s distinguished name (DN) pattern.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityCreateCrossClusterApiKeyRequest' })
export type SecurityCreateCrossClusterApiKeyRequest = z.infer<typeof SecurityCreateCrossClusterApiKeyRequest>

export const SecurityCreateCrossClusterApiKeyResponse = z.object({
  api_key: z.string().describe('Generated API key.'),
  expiration: DurationValue.describe('Expiration in milliseconds for the API key.').optional(),
  id: Id.describe('Unique ID for this API key.'),
  name: Name.describe('Specifies the name for this API key.'),
  encoded: z.string().describe('API key credentials which is the base64-encoding of the UTF-8 representation of `id` and `api_key` joined by a colon (`:`).')
}).meta({ id: 'SecurityCreateCrossClusterApiKeyResponse' })
export type SecurityCreateCrossClusterApiKeyResponse = z.infer<typeof SecurityCreateCrossClusterApiKeyResponse>

/**
 * Create a service account token.
 *
 * Create a service accounts token for access without requiring basic authentication.
 *
 * NOTE: Service account tokens never expire.
 * You must actively delete them if they are no longer needed.
 */
export const SecurityCreateServiceTokenRequest = z.object({
  ...RequestBase.shape,
  namespace: Namespace.describe('The name of the namespace, which is a top-level grouping of service accounts.').meta({ found_in: 'path' }),
  service: Service.describe('The name of the service.').meta({ found_in: 'path' }),
  name: Name.describe('The name for the service account token. If omitted, a random name will be generated. Token names must be at least one and no more than 256 characters. They can contain alphanumeric characters (a-z, A-Z, 0-9), dashes (`-`), and underscores (`_`), but cannot begin with an underscore. NOTE: Token names must be unique in the context of the associated service account. They must also be globally unique with their fully qualified names, which are comprised of the service account principal and token name, such as `<namespace>/<service>/<token-name>`.').optional().meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityCreateServiceTokenRequest' })
export type SecurityCreateServiceTokenRequest = z.infer<typeof SecurityCreateServiceTokenRequest>

export const SecurityCreateServiceTokenToken = z.object({
  name: Name,
  value: z.string()
}).meta({ id: 'SecurityCreateServiceTokenToken' })
export type SecurityCreateServiceTokenToken = z.infer<typeof SecurityCreateServiceTokenToken>

export const SecurityCreateServiceTokenResponse = z.object({
  created: z.boolean(),
  token: SecurityCreateServiceTokenToken
}).meta({ id: 'SecurityCreateServiceTokenResponse' })
export type SecurityCreateServiceTokenResponse = z.infer<typeof SecurityCreateServiceTokenResponse>

export const SecurityDelegatePkiAuthenticationRealm = z.object({
  name: z.string(),
  type: z.string(),
  domain: z.string().optional()
}).meta({ id: 'SecurityDelegatePkiAuthenticationRealm' })
export type SecurityDelegatePkiAuthenticationRealm = z.infer<typeof SecurityDelegatePkiAuthenticationRealm>

export const SecurityDelegatePkiAuthentication = z.object({
  username: z.string(),
  roles: z.array(z.string()),
  full_name: z.union([z.string(), z.null()]),
  email: z.union([z.string(), z.null()]),
  token: z.record(z.string(), z.string()).optional(),
  metadata: Metadata,
  enabled: z.boolean(),
  authentication_realm: SecurityDelegatePkiAuthenticationRealm,
  lookup_realm: SecurityDelegatePkiAuthenticationRealm,
  authentication_type: z.string(),
  api_key: z.record(z.string(), z.string()).optional()
}).meta({ id: 'SecurityDelegatePkiAuthentication' })
export type SecurityDelegatePkiAuthentication = z.infer<typeof SecurityDelegatePkiAuthentication>

/**
 * Delegate PKI authentication.
 *
 * This API implements the exchange of an X509Certificate chain for an Elasticsearch access token.
 * The certificate chain is validated, according to RFC 5280, by sequentially considering the trust configuration of every installed PKI realm that has `delegation.enabled` set to `true`.
 * A successfully trusted client certificate is also subject to the validation of the subject distinguished name according to thw `username_pattern` of the respective realm.
 *
 * This API is called by smart and trusted proxies, such as Kibana, which terminate the user's TLS session but still want to authenticate the user by using a PKI realm—-as if the user connected directly to Elasticsearch.
 *
 * IMPORTANT: The association between the subject public key in the target certificate and the corresponding private key is not validated.
 * This is part of the TLS authentication process and it is delegated to the proxy that calls this API.
 * The proxy is trusted to have performed the TLS authentication and this API translates that authentication into an Elasticsearch access token.
 */
export const SecurityDelegatePkiRequest = z.object({
  ...RequestBase.shape,
  x509_certificate_chain: z.array(z.string()).describe('The X509Certificate chain, which is represented as an ordered string array. Each string in the array is a base64-encoded (Section 4 of RFC4648 - not base64url-encoded) of the certificate\'s DER encoding. The first element is the target certificate that contains the subject distinguished name that is requesting access. This may be followed by additional certificates; each subsequent certificate is used to certify the previous one.').meta({ found_in: 'body' })
}).meta({ id: 'SecurityDelegatePkiRequest' })
export type SecurityDelegatePkiRequest = z.infer<typeof SecurityDelegatePkiRequest>

export const SecurityDelegatePkiResponse = z.object({
  access_token: z.string().describe('An access token associated with the subject distinguished name of the client\'s certificate.'),
  expires_in: long.describe('The amount of time (in seconds) before the token expires.'),
  type: z.string().describe('The type of token.'),
  authentication: SecurityDelegatePkiAuthentication.optional()
}).meta({ id: 'SecurityDelegatePkiResponse' })
export type SecurityDelegatePkiResponse = z.infer<typeof SecurityDelegatePkiResponse>

export const SecurityDeletePrivilegesFoundStatus = z.object({
  found: z.boolean()
}).meta({ id: 'SecurityDeletePrivilegesFoundStatus' })
export type SecurityDeletePrivilegesFoundStatus = z.infer<typeof SecurityDeletePrivilegesFoundStatus>

/**
 * Delete application privileges.
 *
 * To use this API, you must have one of the following privileges:
 *
 * * The `manage_security` cluster privilege (or a greater privilege such as `all`).
 * * The "Manage Application Privileges" global privilege for the application being referenced in the request.
 */
export const SecurityDeletePrivilegesRequest = z.object({
  ...RequestBase.shape,
  application: Name.describe('The name of the application. Application privileges are always associated with exactly one application.').meta({ found_in: 'path' }),
  name: Names.describe('The name of the privilege.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeletePrivilegesRequest' })
export type SecurityDeletePrivilegesRequest = z.infer<typeof SecurityDeletePrivilegesRequest>

export const SecurityDeletePrivilegesResponse = z.record(z.string(), z.record(z.string(), SecurityDeletePrivilegesFoundStatus)).meta({ id: 'SecurityDeletePrivilegesResponse' })
export type SecurityDeletePrivilegesResponse = z.infer<typeof SecurityDeletePrivilegesResponse>

/**
 * Delete roles.
 *
 * Delete roles in the native realm.
 * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
 * The delete roles API cannot remove roles that are defined in roles files.
 */
export const SecurityDeleteRoleRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the role.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeleteRoleRequest' })
export type SecurityDeleteRoleRequest = z.infer<typeof SecurityDeleteRoleRequest>

export const SecurityDeleteRoleResponse = z.object({
  found: z.boolean().describe('If the role is successfully deleted, `found` is `true`. Otherwise, `found` is `false`.')
}).meta({ id: 'SecurityDeleteRoleResponse' })
export type SecurityDeleteRoleResponse = z.infer<typeof SecurityDeleteRoleResponse>

/**
 * Delete role mappings.
 *
 * Role mappings define which roles are assigned to each user.
 * The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files.
 * The delete role mappings API cannot remove role mappings that are defined in role mapping files.
 */
export const SecurityDeleteRoleMappingRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The distinct name that identifies the role mapping. The name is used solely as an identifier to facilitate interaction via the API; it does not affect the behavior of the mapping in any way.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeleteRoleMappingRequest' })
export type SecurityDeleteRoleMappingRequest = z.infer<typeof SecurityDeleteRoleMappingRequest>

export const SecurityDeleteRoleMappingResponse = z.object({
  found: z.boolean().describe('If the mapping is successfully deleted, `found` is `true`. Otherwise, `found` is `false`.')
}).meta({ id: 'SecurityDeleteRoleMappingResponse' })
export type SecurityDeleteRoleMappingResponse = z.infer<typeof SecurityDeleteRoleMappingResponse>

/**
 * Delete service account tokens.
 *
 * Delete service account tokens for a service in a specified namespace.
 */
export const SecurityDeleteServiceTokenRequest = z.object({
  ...RequestBase.shape,
  namespace: Namespace.describe('The namespace, which is a top-level grouping of service accounts.').meta({ found_in: 'path' }),
  service: Service.describe('The service name.').meta({ found_in: 'path' }),
  name: Name.describe('The name of the service account token.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeleteServiceTokenRequest' })
export type SecurityDeleteServiceTokenRequest = z.infer<typeof SecurityDeleteServiceTokenRequest>

export const SecurityDeleteServiceTokenResponse = z.object({
  found: z.boolean().describe('If the service account token is successfully deleted, the request returns `{"found": true}`. Otherwise, the response will have status code 404 and `found` is set to `false`.')
}).meta({ id: 'SecurityDeleteServiceTokenResponse' })
export type SecurityDeleteServiceTokenResponse = z.infer<typeof SecurityDeleteServiceTokenResponse>

/**
 * Delete users.
 *
 * Delete users from the native realm.
 */
export const SecurityDeleteUserRequest = z.object({
  ...RequestBase.shape,
  username: Username.describe('An identifier for the user.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeleteUserRequest' })
export type SecurityDeleteUserRequest = z.infer<typeof SecurityDeleteUserRequest>

export const SecurityDeleteUserResponse = z.object({
  found: z.boolean().describe('If the user is successfully deleted, the request returns `{"found": true}`. Otherwise, `found` is set to `false`.')
}).meta({ id: 'SecurityDeleteUserResponse' })
export type SecurityDeleteUserResponse = z.infer<typeof SecurityDeleteUserResponse>

/**
 * Disable users.
 *
 * Disable users in the native realm.
 * By default, when you create users, they are enabled.
 * You can use this API to revoke a user's access to Elasticsearch.
 */
export const SecurityDisableUserRequest = z.object({
  ...RequestBase.shape,
  username: Username.describe('An identifier for the user.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDisableUserRequest' })
export type SecurityDisableUserRequest = z.infer<typeof SecurityDisableUserRequest>

export const SecurityDisableUserResponse = z.object({
}).meta({ id: 'SecurityDisableUserResponse' })
export type SecurityDisableUserResponse = z.infer<typeof SecurityDisableUserResponse>

/**
 * Disable a user profile.
 *
 * Disable user profiles so that they are not visible in user profile searches.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 *
 * When you activate a user profile, its automatically enabled and visible in user profile searches. You can use the disable user profile API to disable a user profile so it’s not visible in these searches.
 * To re-enable a disabled user profile, use the enable user profile API .
 */
export const SecurityDisableUserProfileRequest = z.object({
  ...RequestBase.shape,
  uid: SecurityUserProfileId.describe('Unique identifier for the user profile.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If \'true\', Elasticsearch refreshes the affected shards to make this operation visible to search. If \'wait_for\', it waits for a refresh to make this operation visible to search. If \'false\', it does nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDisableUserProfileRequest' })
export type SecurityDisableUserProfileRequest = z.infer<typeof SecurityDisableUserProfileRequest>

export const SecurityDisableUserProfileResponse = AcknowledgedResponseBase.meta({ id: 'SecurityDisableUserProfileResponse' })
export type SecurityDisableUserProfileResponse = z.infer<typeof SecurityDisableUserProfileResponse>

/**
 * Enable users.
 *
 * Enable users in the native realm.
 * By default, when you create users, they are enabled.
 */
export const SecurityEnableUserRequest = z.object({
  ...RequestBase.shape,
  username: Username.describe('An identifier for the user.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityEnableUserRequest' })
export type SecurityEnableUserRequest = z.infer<typeof SecurityEnableUserRequest>

export const SecurityEnableUserResponse = z.object({
}).meta({ id: 'SecurityEnableUserResponse' })
export type SecurityEnableUserResponse = z.infer<typeof SecurityEnableUserResponse>

/**
 * Enable a user profile.
 *
 * Enable user profiles to make them visible in user profile searches.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 *
 * When you activate a user profile, it's automatically enabled and visible in user profile searches.
 * If you later disable the user profile, you can use the enable user profile API to make the profile visible in these searches again.
 */
export const SecurityEnableUserProfileRequest = z.object({
  ...RequestBase.shape,
  uid: SecurityUserProfileId.describe('A unique identifier for the user profile.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If \'true\', Elasticsearch refreshes the affected shards to make this operation visible to search. If \'wait_for\', it waits for a refresh to make this operation visible to search. If \'false\', nothing is done with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityEnableUserProfileRequest' })
export type SecurityEnableUserProfileRequest = z.infer<typeof SecurityEnableUserProfileRequest>

export const SecurityEnableUserProfileResponse = AcknowledgedResponseBase.meta({ id: 'SecurityEnableUserProfileResponse' })
export type SecurityEnableUserProfileResponse = z.infer<typeof SecurityEnableUserProfileResponse>

/**
 * Enroll Kibana.
 *
 * Enable a Kibana instance to configure itself for communication with a secured Elasticsearch cluster.
 *
 * NOTE: This API is currently intended for internal use only by Kibana.
 * Kibana uses this API internally to configure itself for communications with an Elasticsearch cluster that already has security features enabled.
 */
export const SecurityEnrollKibanaRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityEnrollKibanaRequest' })
export type SecurityEnrollKibanaRequest = z.infer<typeof SecurityEnrollKibanaRequest>

export const SecurityEnrollKibanaToken = z.object({
  name: z.string().describe('The name of the bearer token for the `elastic/kibana` service account.'),
  value: z.string().describe('The value of the bearer token for the `elastic/kibana` service account. Use this value to authenticate the service account with Elasticsearch.')
}).meta({ id: 'SecurityEnrollKibanaToken' })
export type SecurityEnrollKibanaToken = z.infer<typeof SecurityEnrollKibanaToken>

export const SecurityEnrollKibanaResponse = z.object({
  token: SecurityEnrollKibanaToken,
  http_ca: z.string().describe('The CA certificate used to sign the node certificates that Elasticsearch uses for TLS on the HTTP layer. The certificate is returned as a Base64 encoded string of the ASN.1 DER encoding of the certificate.')
}).meta({ id: 'SecurityEnrollKibanaResponse' })
export type SecurityEnrollKibanaResponse = z.infer<typeof SecurityEnrollKibanaResponse>

/**
 * Enroll a node.
 *
 * Enroll a new node to allow it to join an existing cluster with security features enabled.
 *
 * The response contains all the necessary information for the joining node to bootstrap discovery and security related settings so that it can successfully join the cluster.
 * The response contains key and certificate material that allows the caller to generate valid signed certificates for the HTTP layer of all nodes in the cluster.
 */
export const SecurityEnrollNodeRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityEnrollNodeRequest' })
export type SecurityEnrollNodeRequest = z.infer<typeof SecurityEnrollNodeRequest>

export const SecurityEnrollNodeResponse = z.object({
  http_ca_key: z.string().describe('The CA private key that can be used by the new node in order to sign its certificate for the HTTP layer, as a Base64 encoded string of the ASN.1 DER encoding of the key.'),
  http_ca_cert: z.string().describe('The CA certificate that can be used by the new node in order to sign its certificate for the HTTP layer, as a Base64 encoded string of the ASN.1 DER encoding of the certificate.'),
  transport_ca_cert: z.string().describe('The CA certificate that is used to sign the TLS certificate for the transport layer, as a Base64 encoded string of the ASN.1 DER encoding of the certificate.'),
  transport_key: z.string().describe('The private key that the node can use for TLS for its transport layer, as a Base64 encoded string of the ASN.1 DER encoding of the key.'),
  transport_cert: z.string().describe('The certificate that the node can use for TLS for its transport layer, as a Base64 encoded string of the ASN.1 DER encoding of the certificate.'),
  nodes_addresses: z.array(z.string()).describe('A list of transport addresses in the form of `host:port` for the nodes that are already members of the cluster.')
}).meta({ id: 'SecurityEnrollNodeResponse' })
export type SecurityEnrollNodeResponse = z.infer<typeof SecurityEnrollNodeResponse>

/**
 * Get API key information.
 *
 * Retrieves information for one or more API keys.
 * NOTE: If you have only the `manage_own_api_key` privilege, this API returns only the API keys that you own.
 * If you have `read_security`, `manage_api_key` or greater privileges (including `manage_security`), this API returns all API keys regardless of ownership.
 */
export const SecurityGetApiKeyRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('An API key id. This parameter cannot be used with any of `name`, `realm_name` or `username`.').optional().meta({ found_in: 'query' }),
  name: Name.describe('An API key name. This parameter cannot be used with any of `id`, `realm_name` or `username`. It supports prefix search with wildcard.').optional().meta({ found_in: 'query' }),
  owner: z.boolean().describe('A boolean flag that can be used to query API keys owned by the currently authenticated user. The `realm_name` or `username` parameters cannot be specified when this parameter is set to `true` as they are assumed to be the currently authenticated ones.').optional().meta({ found_in: 'query' }),
  realm_name: Name.describe('The name of an authentication realm. This parameter cannot be used with either `id` or `name` or when `owner` flag is set to `true`.').optional().meta({ found_in: 'query' }),
  username: Username.describe('The username of a user. This parameter cannot be used with either `id` or `name` or when `owner` flag is set to `true`.').optional().meta({ found_in: 'query' }),
  with_limited_by: z.boolean().describe('Return the snapshot of the owner user\'s role descriptors associated with the API key. An API key\'s actual permission is the intersection of its assigned role descriptors and the owner user\'s role descriptors.').optional().meta({ found_in: 'query' }),
  active_only: z.boolean().describe('A boolean flag that can be used to query API keys that are currently active. An API key is considered active if it is neither invalidated, nor expired at query time. You can specify this together with other parameters such as `owner` or `name`. If `active_only` is false, the response will include both active and inactive (expired or invalidated) keys.').optional().meta({ found_in: 'query' }),
  with_profile_uid: z.boolean().describe('Determines whether to also retrieve the profile uid, for the API key owner principal, if it exists.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityGetApiKeyRequest' })
export type SecurityGetApiKeyRequest = z.infer<typeof SecurityGetApiKeyRequest>

export const SecurityGetApiKeyResponse = z.object({
  api_keys: z.array(SecurityApiKey)
}).meta({ id: 'SecurityGetApiKeyResponse' })
export type SecurityGetApiKeyResponse = z.infer<typeof SecurityGetApiKeyResponse>

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

/**
 * Get application privileges.
 *
 * To use this API, you must have one of the following privileges:
 *
 * * The `read_security` cluster privilege (or a greater privilege such as `manage_security` or `all`).
 * * The "Manage Application Privileges" global privilege for the application being referenced in the request.
 */
export const SecurityGetPrivilegesRequest = z.object({
  ...RequestBase.shape,
  application: Name.describe('The name of the application. Application privileges are always associated with exactly one application. If you do not specify this parameter, the API returns information about all privileges for all applications.').optional().meta({ found_in: 'path' }),
  name: Names.describe('The name of the privilege. If you do not specify this parameter, the API returns information about all privileges for the requested application.').optional().meta({ found_in: 'path' })
}).meta({ id: 'SecurityGetPrivilegesRequest' })
export type SecurityGetPrivilegesRequest = z.infer<typeof SecurityGetPrivilegesRequest>

export const SecurityPutPrivilegesActions = z.object({
  actions: z.array(z.string()),
  application: z.string().optional(),
  name: Name.optional(),
  metadata: Metadata.optional()
}).meta({ id: 'SecurityPutPrivilegesActions' })
export type SecurityPutPrivilegesActions = z.infer<typeof SecurityPutPrivilegesActions>

export const SecurityGetPrivilegesResponse = z.record(z.string(), z.record(z.string(), SecurityPutPrivilegesActions)).meta({ id: 'SecurityGetPrivilegesResponse' })
export type SecurityGetPrivilegesResponse = z.infer<typeof SecurityGetPrivilegesResponse>

/**
 * Get roles.
 *
 * Get roles in the native realm.
 * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
 * The get roles API cannot retrieve roles that are defined in roles files.
 */
export const SecurityGetRoleRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('The name of the role. You can specify multiple roles as a comma-separated list. If you do not specify this parameter, the API returns information about all roles.').optional().meta({ found_in: 'path' })
}).meta({ id: 'SecurityGetRoleRequest' })
export type SecurityGetRoleRequest = z.infer<typeof SecurityGetRoleRequest>

export const SecurityGetRoleRole = z.object({
  cluster: z.array(SecurityClusterPrivilege),
  indices: z.array(SecurityIndicesPrivileges),
  metadata: Metadata,
  description: z.string().optional(),
  run_as: z.array(z.string()).optional(),
  transient_metadata: z.record(z.string(), z.any()).optional(),
  applications: z.array(SecurityApplicationPrivileges),
  role_templates: z.array(SecurityRoleTemplate).optional(),
  global: z.record(z.string(), z.record(z.string(), z.record(z.string(), z.array(z.string())))).optional()
}).meta({ id: 'SecurityGetRoleRole' })
export type SecurityGetRoleRole = z.infer<typeof SecurityGetRoleRole>

export const SecurityGetRoleResponse = z.record(z.string(), SecurityGetRoleRole).meta({ id: 'SecurityGetRoleResponse' })
export type SecurityGetRoleResponse = z.infer<typeof SecurityGetRoleResponse>

/**
 * Get role mappings.
 *
 * Role mappings define which roles are assigned to each user.
 * The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files.
 * The get role mappings API cannot retrieve role mappings that are defined in role mapping files.
 */
export const SecurityGetRoleMappingRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('The distinct name that identifies the role mapping. The name is used solely as an identifier to facilitate interaction via the API; it does not affect the behavior of the mapping in any way. You can specify multiple mapping names as a comma-separated list. If you do not specify this parameter, the API returns information about all role mappings.').optional().meta({ found_in: 'path' })
}).meta({ id: 'SecurityGetRoleMappingRequest' })
export type SecurityGetRoleMappingRequest = z.infer<typeof SecurityGetRoleMappingRequest>

export const SecurityGetRoleMappingResponse = z.record(z.string(), SecurityRoleMapping).meta({ id: 'SecurityGetRoleMappingResponse' })
export type SecurityGetRoleMappingResponse = z.infer<typeof SecurityGetRoleMappingResponse>

/**
 * Get service accounts.
 *
 * Get a list of service accounts that match the provided path parameters.
 *
 * NOTE: Currently, only the `elastic/fleet-server` service account is available.
 */
export const SecurityGetServiceAccountsRequest = z.object({
  ...RequestBase.shape,
  namespace: Namespace.describe('The name of the namespace. Omit this parameter to retrieve information about all service accounts. If you omit this parameter, you must also omit the `service` parameter.').optional().meta({ found_in: 'path' }),
  service: Service.describe('The service name. Omit this parameter to retrieve information about all service accounts that belong to the specified `namespace`.').optional().meta({ found_in: 'path' })
}).meta({ id: 'SecurityGetServiceAccountsRequest' })
export type SecurityGetServiceAccountsRequest = z.infer<typeof SecurityGetServiceAccountsRequest>

export const SecurityGetServiceAccountsRoleDescriptorWrapper = z.object({
  role_descriptor: SecurityRoleDescriptorRead
}).meta({ id: 'SecurityGetServiceAccountsRoleDescriptorWrapper' })
export type SecurityGetServiceAccountsRoleDescriptorWrapper = z.infer<typeof SecurityGetServiceAccountsRoleDescriptorWrapper>

export const SecurityGetServiceAccountsResponse = z.record(z.string(), SecurityGetServiceAccountsRoleDescriptorWrapper).meta({ id: 'SecurityGetServiceAccountsResponse' })
export type SecurityGetServiceAccountsResponse = z.infer<typeof SecurityGetServiceAccountsResponse>

export const SecurityGetServiceCredentialsNodesCredentialsFileToken = z.object({
  nodes: z.array(z.string())
}).meta({ id: 'SecurityGetServiceCredentialsNodesCredentialsFileToken' })
export type SecurityGetServiceCredentialsNodesCredentialsFileToken = z.infer<typeof SecurityGetServiceCredentialsNodesCredentialsFileToken>

export const SecurityGetServiceCredentialsNodesCredentials = z.object({
  _nodes: NodeStatistics.describe('General status showing how nodes respond to the above collection request'),
  file_tokens: z.record(z.string(), SecurityGetServiceCredentialsNodesCredentialsFileToken).describe('File-backed tokens collected from all nodes')
}).meta({ id: 'SecurityGetServiceCredentialsNodesCredentials' })
export type SecurityGetServiceCredentialsNodesCredentials = z.infer<typeof SecurityGetServiceCredentialsNodesCredentials>

/**
 * Get service account credentials.
 *
 * To use this API, you must have at least the `read_security` cluster privilege (or a greater privilege such as `manage_service_account` or `manage_security`).
 *
 * The response includes service account tokens that were created with the create service account tokens API as well as file-backed tokens from all nodes of the cluster.
 *
 * NOTE: For tokens backed by the `service_tokens` file, the API collects them from all nodes of the cluster.
 * Tokens with the same name from different nodes are assumed to be the same token and are only counted once towards the total number of service tokens.
 */
export const SecurityGetServiceCredentialsRequest = z.object({
  ...RequestBase.shape,
  namespace: Namespace.describe('The name of the namespace.').meta({ found_in: 'path' }),
  service: Name.describe('The service name.').meta({ found_in: 'path' })
}).meta({ id: 'SecurityGetServiceCredentialsRequest' })
export type SecurityGetServiceCredentialsRequest = z.infer<typeof SecurityGetServiceCredentialsRequest>

export const SecurityGetServiceCredentialsResponse = z.object({
  service_account: z.string(),
  count: integer,
  tokens: z.record(z.string(), Metadata),
  nodes_credentials: SecurityGetServiceCredentialsNodesCredentials.describe('Service account credentials collected from all nodes of the cluster.')
}).meta({ id: 'SecurityGetServiceCredentialsResponse' })
export type SecurityGetServiceCredentialsResponse = z.infer<typeof SecurityGetServiceCredentialsResponse>

/**
 * Get security index settings.
 *
 * Get the user-configurable settings for the security internal index (`.security` and associated indices).
 * Only a subset of the index settings — those that are user-configurable—will be shown.
 * This includes:
 *
 * * `index.auto_expand_replicas`
 * * `index.number_of_replicas`
 */
export const SecurityGetSettingsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityGetSettingsRequest' })
export type SecurityGetSettingsRequest = z.infer<typeof SecurityGetSettingsRequest>

export const SecurityGetSettingsResponse = z.object({
  security: SecuritySecuritySettings.describe('Settings for the index used for most security configuration, including native realm users and roles configured with the API.'),
  'security-profile': SecuritySecuritySettings.describe('Settings for the index used to store profile information.'),
  'security-tokens': SecuritySecuritySettings.describe('Settings for the index used to store tokens.')
}).meta({ id: 'SecurityGetSettingsResponse' })
export type SecurityGetSettingsResponse = z.infer<typeof SecurityGetSettingsResponse>

/**
 * Get security stats.
 *
 * Gather security usage statistics from all node(s) within the cluster.
 */
export const SecurityGetStatsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityGetStatsRequest' })
export type SecurityGetStatsRequest = z.infer<typeof SecurityGetStatsRequest>

export const SecurityGetStatsResponse = z.object({
  nodes: z.record(z.string(), SecurityNodeSecurityStats).describe('A map of node IDs to security statistics for that node.')
}).meta({ id: 'SecurityGetStatsResponse' })
export type SecurityGetStatsResponse = z.infer<typeof SecurityGetStatsResponse>

export const SecurityGetTokenAccessTokenGrantType = z.enum(['password', 'client_credentials', '_kerberos', 'refresh_token']).meta({ id: 'SecurityGetTokenAccessTokenGrantType' })
export type SecurityGetTokenAccessTokenGrantType = z.infer<typeof SecurityGetTokenAccessTokenGrantType>

export const SecurityGetTokenUserRealm = z.object({
  name: Name,
  type: z.string()
}).meta({ id: 'SecurityGetTokenUserRealm' })
export type SecurityGetTokenUserRealm = z.infer<typeof SecurityGetTokenUserRealm>

export const SecurityGetTokenAuthenticationProvider = z.object({
  type: z.string(),
  name: Name
}).meta({ id: 'SecurityGetTokenAuthenticationProvider' })
export type SecurityGetTokenAuthenticationProvider = z.infer<typeof SecurityGetTokenAuthenticationProvider>

export const SecurityGetTokenAuthenticatedUser = z.object({
  ...SecurityUser.shape,
  authentication_realm: SecurityGetTokenUserRealm,
  lookup_realm: SecurityGetTokenUserRealm,
  authentication_provider: SecurityGetTokenAuthenticationProvider.optional(),
  authentication_type: z.string()
}).meta({ id: 'SecurityGetTokenAuthenticatedUser' })
export type SecurityGetTokenAuthenticatedUser = z.infer<typeof SecurityGetTokenAuthenticatedUser>

/**
 * Get a token.
 *
 * Create a bearer token for access without requiring basic authentication.
 * The tokens are created by the Elasticsearch Token Service, which is automatically enabled when you configure TLS on the HTTP interface.
 * Alternatively, you can explicitly enable the `xpack.security.authc.token.enabled` setting.
 * When you are running in production mode, a bootstrap check prevents you from enabling the token service unless you also enable TLS on the HTTP interface.
 *
 * The get token API takes the same parameters as a typical OAuth 2.0 token API except for the use of a JSON request body.
 *
 * A successful get token API call returns a JSON structure that contains the access token, the amount of time (seconds) that the token expires in, the type, and the scope if available.
 *
 * The tokens returned by the get token API have a finite period of time for which they are valid and after that time period, they can no longer be used.
 * That time period is defined by the `xpack.security.authc.token.timeout` setting.
 * If you want to invalidate a token immediately, you can do so by using the invalidate token API.
 */
export const SecurityGetTokenRequest = z.object({
  ...RequestBase.shape,
  grant_type: SecurityGetTokenAccessTokenGrantType.describe('The type of grant. Supported grant types are: `password`, `_kerberos`, `client_credentials`, and `refresh_token`.').optional().meta({ found_in: 'body' }),
  scope: z.string().describe('The scope of the token. Currently tokens are only issued for a scope of FULL regardless of the value sent with the request.').optional().meta({ found_in: 'body' }),
  password: Password.describe('The user\'s password. If you specify the `password` grant type, this parameter is required. This parameter is not valid with any other supported grant type.').optional().meta({ found_in: 'body' }),
  kerberos_ticket: z.string().describe('The base64 encoded kerberos ticket. If you specify the `_kerberos` grant type, this parameter is required. This parameter is not valid with any other supported grant type.').optional().meta({ found_in: 'body' }),
  refresh_token: z.string().describe('The string that was returned when you created the token, which enables you to extend its life. If you specify the `refresh_token` grant type, this parameter is required. This parameter is not valid with any other supported grant type.').optional().meta({ found_in: 'body' }),
  username: Username.describe('The username that identifies the user. If you specify the `password` grant type, this parameter is required. This parameter is not valid with any other supported grant type.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityGetTokenRequest' })
export type SecurityGetTokenRequest = z.infer<typeof SecurityGetTokenRequest>

export const SecurityGetTokenResponse = z.object({
  access_token: z.string(),
  expires_in: long,
  scope: z.string().optional(),
  type: z.string(),
  refresh_token: z.string().optional(),
  kerberos_authentication_response_token: z.string().optional(),
  authentication: SecurityGetTokenAuthenticatedUser
}).meta({ id: 'SecurityGetTokenResponse' })
export type SecurityGetTokenResponse = z.infer<typeof SecurityGetTokenResponse>

/**
 * Get users.
 *
 * Get information about users in the native realm and built-in users.
 */
export const SecurityGetUserRequest = z.object({
  ...RequestBase.shape,
  username: z.union([Username, z.array(Username)]).describe('An identifier for the user. You can specify multiple usernames as a comma-separated list. If you omit this parameter, the API retrieves information about all users.').optional().meta({ found_in: 'path' }),
  with_profile_uid: z.boolean().describe('Determines whether to retrieve the user profile UID, if it exists, for the users.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityGetUserRequest' })
export type SecurityGetUserRequest = z.infer<typeof SecurityGetUserRequest>

export const SecurityGetUserResponse = z.record(z.string(), SecurityUser).meta({ id: 'SecurityGetUserResponse' })
export type SecurityGetUserResponse = z.infer<typeof SecurityGetUserResponse>

/**
 * Get user privileges.
 *
 * Get the security privileges for the logged in user.
 * All users can use this API, but only to determine their own privileges.
 * To check the privileges of other users, you must use the run as feature.
 * To check whether a user has a specific list of privileges, use the has privileges API.
 */
export const SecurityGetUserPrivilegesRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityGetUserPrivilegesRequest' })
export type SecurityGetUserPrivilegesRequest = z.infer<typeof SecurityGetUserPrivilegesRequest>

export const SecurityGetUserPrivilegesResponse = z.object({
  applications: z.array(SecurityApplicationPrivileges),
  cluster: z.array(z.string()),
  remote_cluster: z.array(SecurityRemoteClusterPrivileges).optional(),
  global: z.array(SecurityGlobalPrivilege),
  indices: z.array(SecurityUserIndicesPrivileges),
  remote_indices: z.array(SecurityRemoteUserIndicesPrivileges).optional(),
  run_as: z.array(z.string())
}).meta({ id: 'SecurityGetUserPrivilegesResponse' })
export type SecurityGetUserPrivilegesResponse = z.infer<typeof SecurityGetUserPrivilegesResponse>

export const SecurityGetUserProfileGetUserProfileErrors = z.object({
  count: long,
  details: z.record(SecurityUserProfileId, z.lazy(() => ErrorCause))
}).meta({ id: 'SecurityGetUserProfileGetUserProfileErrors' })
export type SecurityGetUserProfileGetUserProfileErrors = z.infer<typeof SecurityGetUserProfileGetUserProfileErrors>

/**
 * Get a user profile.
 *
 * Get a user's profile using the unique profile ID.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 */
export const SecurityGetUserProfileRequest = z.object({
  ...RequestBase.shape,
  uid: z.union([SecurityUserProfileId, z.array(SecurityUserProfileId)]).describe('A unique identifier for the user profile.').meta({ found_in: 'path' }),
  data: z.union([z.string(), z.array(z.string())]).describe('A comma-separated list of filters for the `data` field of the profile document. To return all content use `data=*`. To return a subset of content use `data=<key>` to retrieve content nested under the specified `<key>`. By default returns no `data` content.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityGetUserProfileRequest' })
export type SecurityGetUserProfileRequest = z.infer<typeof SecurityGetUserProfileRequest>

export const SecurityGetUserProfileResponse = z.object({
  profiles: z.array(SecurityUserProfileWithMetadata).describe('A successful call returns the JSON representation of the user profile and its internal versioning numbers. The API returns an empty object if no profile document is found for the provided `uid`. The content of the data field is not returned by default to avoid deserializing a potential large payload.'),
  errors: SecurityGetUserProfileGetUserProfileErrors.optional()
}).meta({ id: 'SecurityGetUserProfileResponse' })
export type SecurityGetUserProfileResponse = z.infer<typeof SecurityGetUserProfileResponse>

export const SecurityGrantApiKeyApiKeyGrantType = z.enum(['access_token', 'password']).meta({ id: 'SecurityGrantApiKeyApiKeyGrantType' })
export type SecurityGrantApiKeyApiKeyGrantType = z.infer<typeof SecurityGrantApiKeyApiKeyGrantType>

export const SecurityGrantApiKeyGrantApiKey = z.object({
  name: Name,
  expiration: DurationLarge.describe('Expiration time for the API key. By default, API keys never expire.').optional(),
  role_descriptors: z.union([z.record(z.string(), SecurityRoleDescriptor), z.array(z.record(z.string(), SecurityRoleDescriptor))]).describe('The role descriptors for this API key. When it is not specified or is an empty array, the API key has a point in time snapshot of permissions of the specified user or access token. If you supply role descriptors, the resultant permissions are an intersection of API keys permissions and the permissions of the user or access token.').optional(),
  metadata: Metadata.describe('Arbitrary metadata that you want to associate with the API key. It supports nested data structure. Within the `metadata` object, keys beginning with `_` are reserved for system usage.').optional()
}).meta({ id: 'SecurityGrantApiKeyGrantApiKey' })
export type SecurityGrantApiKeyGrantApiKey = z.infer<typeof SecurityGrantApiKeyGrantApiKey>

/**
 * Grant an API key.
 *
 * Create an API key on behalf of another user.
 * This API is similar to the create API keys API, however it creates the API key for a user that is different than the user that runs the API.
 * The caller must have authentication credentials for the user on whose behalf the API key will be created.
 * It is not possible to use this API to create an API key without that user's credentials.
 * The supported user authentication credential types are:
 *
 * * username and password
 * * Elasticsearch access tokens
 * * JWTs
 *
 * The user, for whom the authentication credentials is provided, can optionally "run as" (impersonate) another user.
 * In this case, the API key will be created on behalf of the impersonated user.
 *
 * This API is intended be used by applications that need to create and manage API keys for end users, but cannot guarantee that those users have permission to create API keys on their own behalf.
 * The API keys are created by the Elasticsearch API key service, which is automatically enabled.
 *
 * A successful grant API key API call returns a JSON structure that contains the API key, its unique id, and its name.
 * If applicable, it also returns expiration information for the API key in milliseconds.
 *
 * By default, API keys never expire. You can specify expiration information when you create the API keys.
 */
export const SecurityGrantApiKeyRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If \'true\', Elasticsearch refreshes the affected shards to make this operation visible to search. If \'wait_for\', it waits for a refresh to make this operation visible to search. If \'false\', nothing is done with refreshes.').optional().meta({ found_in: 'query' }),
  api_key: SecurityGrantApiKeyGrantApiKey.describe('The API key.').meta({ found_in: 'body' }),
  grant_type: SecurityGrantApiKeyApiKeyGrantType.describe('The type of grant. Supported grant types are: `access_token`, `password`.').meta({ found_in: 'body' }),
  access_token: z.string().describe('The user\'s access token. If you specify the `access_token` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' }),
  username: Username.describe('The user name that identifies the user. If you specify the `password` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' }),
  password: Password.describe('The user\'s password. If you specify the `password` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' }),
  run_as: Username.describe('The name of the user to be impersonated.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityGrantApiKeyRequest' })
export type SecurityGrantApiKeyRequest = z.infer<typeof SecurityGrantApiKeyRequest>

export const SecurityGrantApiKeyResponse = z.object({
  api_key: z.string(),
  id: Id,
  name: Name,
  expiration: EpochTime.optional(),
  encoded: z.string()
}).meta({ id: 'SecurityGrantApiKeyResponse' })
export type SecurityGrantApiKeyResponse = z.infer<typeof SecurityGrantApiKeyResponse>

export const SecurityHasPrivilegesApplicationPrivilegesCheck = z.object({
  application: z.string().describe('The name of the application.'),
  privileges: z.array(z.string()).describe('A list of the privileges that you want to check for the specified resources. It may be either application privilege names or the names of actions that are granted by those privileges'),
  resources: z.array(z.string()).describe('A list of resource names against which the privileges should be checked.')
}).meta({ id: 'SecurityHasPrivilegesApplicationPrivilegesCheck' })
export type SecurityHasPrivilegesApplicationPrivilegesCheck = z.infer<typeof SecurityHasPrivilegesApplicationPrivilegesCheck>

export const SecurityHasPrivilegesPrivileges = z.record(z.string(), z.boolean()).meta({ id: 'SecurityHasPrivilegesPrivileges' })
export type SecurityHasPrivilegesPrivileges = z.infer<typeof SecurityHasPrivilegesPrivileges>

export const SecurityHasPrivilegesResourcePrivileges = z.record(Name, SecurityHasPrivilegesPrivileges).meta({ id: 'SecurityHasPrivilegesResourcePrivileges' })
export type SecurityHasPrivilegesResourcePrivileges = z.infer<typeof SecurityHasPrivilegesResourcePrivileges>

export const SecurityHasPrivilegesApplicationsPrivileges = z.record(Name, SecurityHasPrivilegesResourcePrivileges).meta({ id: 'SecurityHasPrivilegesApplicationsPrivileges' })
export type SecurityHasPrivilegesApplicationsPrivileges = z.infer<typeof SecurityHasPrivilegesApplicationsPrivileges>

export const SecurityHasPrivilegesIndexPrivilegesCheck = z.object({
  names: Indices.describe('A list of indices.'),
  privileges: z.array(SecurityIndexPrivilege).describe('A list of the privileges that you want to check for the specified indices.'),
  allow_restricted_indices: z.boolean().describe('This needs to be set to `true` (default is `false`) if using wildcards or regexps for patterns that cover restricted indices. Implicitly, restricted indices do not match index patterns because restricted indices usually have limited privileges and including them in pattern tests would render most such tests false. If restricted indices are explicitly included in the names list, privileges will be checked against them regardless of the value of `allow_restricted_indices`.').optional()
}).meta({ id: 'SecurityHasPrivilegesIndexPrivilegesCheck' })
export type SecurityHasPrivilegesIndexPrivilegesCheck = z.infer<typeof SecurityHasPrivilegesIndexPrivilegesCheck>

/**
 * Check user privileges.
 *
 * Determine whether the specified user has a specified list of privileges.
 * All users can use this API, but only to determine their own privileges.
 * To check the privileges of other users, you must use the run as feature.
 */
export const SecurityHasPrivilegesRequest = z.object({
  ...RequestBase.shape,
  user: Name.describe('Username').optional().meta({ found_in: 'path' }),
  application: z.array(SecurityHasPrivilegesApplicationPrivilegesCheck).optional().meta({ found_in: 'body' }),
  cluster: z.array(SecurityClusterPrivilege).describe('A list of the cluster privileges that you want to check.').optional().meta({ found_in: 'body' }),
  index: z.array(SecurityHasPrivilegesIndexPrivilegesCheck).optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityHasPrivilegesRequest' })
export type SecurityHasPrivilegesRequest = z.infer<typeof SecurityHasPrivilegesRequest>

export const SecurityHasPrivilegesResponse = z.object({
  application: SecurityHasPrivilegesApplicationsPrivileges,
  cluster: z.record(z.string(), z.boolean()),
  has_all_requested: z.boolean(),
  index: z.record(IndexName, SecurityHasPrivilegesPrivileges),
  username: Username
}).meta({ id: 'SecurityHasPrivilegesResponse' })
export type SecurityHasPrivilegesResponse = z.infer<typeof SecurityHasPrivilegesResponse>

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

/**
 * Invalidate API keys.
 *
 * This API invalidates API keys created by the create API key or grant API key APIs.
 * Invalidated API keys fail authentication, but they can still be viewed using the get API key information and query API key information APIs, for at least the configured retention period, until they are automatically deleted.
 *
 * To use this API, you must have at least the `manage_security`, `manage_api_key`, or `manage_own_api_key` cluster privileges.
 * The `manage_security` privilege allows deleting any API key, including both REST and cross cluster API keys.
 * The `manage_api_key` privilege allows deleting any REST API key, but not cross cluster API keys.
 * The `manage_own_api_key` only allows deleting REST API keys that are owned by the user.
 * In addition, with the `manage_own_api_key` privilege, an invalidation request must be issued in one of the three formats:
 *
 * - Set the parameter `owner=true`.
 * - Or, set both `username` and `realm_name` to match the user's identity.
 * - Or, if the request is issued by an API key, that is to say an API key invalidates itself, specify its ID in the `ids` field.
 */
export const SecurityInvalidateApiKeyRequest = z.object({
  ...RequestBase.shape,
  id: Id.optional().meta({ found_in: 'body' }),
  ids: z.array(Id).describe('A list of API key ids. This parameter cannot be used with any of `name`, `realm_name`, or `username`.').optional().meta({ found_in: 'body' }),
  name: Name.describe('An API key name. This parameter cannot be used with any of `ids`, `realm_name` or `username`.').optional().meta({ found_in: 'body' }),
  owner: z.boolean().describe('Query API keys owned by the currently authenticated user. The `realm_name` or `username` parameters cannot be specified when this parameter is set to `true` as they are assumed to be the currently authenticated ones. NOTE: At least one of `ids`, `name`, `username`, and `realm_name` must be specified if `owner` is `false`.').optional().meta({ found_in: 'body' }),
  realm_name: z.string().describe('The name of an authentication realm. This parameter cannot be used with either `ids` or `name`, or when `owner` flag is set to `true`.').optional().meta({ found_in: 'body' }),
  username: Username.describe('The username of a user. This parameter cannot be used with either `ids` or `name` or when `owner` flag is set to `true`.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityInvalidateApiKeyRequest' })
export type SecurityInvalidateApiKeyRequest = z.infer<typeof SecurityInvalidateApiKeyRequest>

export const SecurityInvalidateApiKeyResponse = z.object({
  error_count: integer.describe('The number of errors that were encountered when invalidating the API keys.'),
  error_details: z.array(z.lazy(() => ErrorCause)).describe('Details about the errors. This field is not present in the response when `error_count` is `0`.').optional(),
  invalidated_api_keys: z.array(z.string()).describe('The IDs of the API keys that were invalidated as part of this request.'),
  previously_invalidated_api_keys: z.array(z.string()).describe('The IDs of the API keys that were already invalidated.')
}).meta({ id: 'SecurityInvalidateApiKeyResponse' })
export type SecurityInvalidateApiKeyResponse = z.infer<typeof SecurityInvalidateApiKeyResponse>

/**
 * Invalidate a token.
 *
 * The access tokens returned by the get token API have a finite period of time for which they are valid.
 * After that time period, they can no longer be used.
 * The time period is defined by the `xpack.security.authc.token.timeout` setting.
 *
 * The refresh tokens returned by the get token API are only valid for 24 hours.
 * They can also be used exactly once.
 * If you want to invalidate one or more access or refresh tokens immediately, use this invalidate token API.
 *
 * NOTE: While all parameters are optional, at least one of them is required.
 * More specifically, either one of `token` or `refresh_token` parameters is required.
 * If none of these two are specified, then `realm_name` and/or `username` need to be specified.
 */
export const SecurityInvalidateTokenRequest = z.object({
  ...RequestBase.shape,
  token: z.string().describe('An access token. This parameter cannot be used if any of `refresh_token`, `realm_name`, or `username` are used.').optional().meta({ found_in: 'body' }),
  refresh_token: z.string().describe('A refresh token. This parameter cannot be used if any of `refresh_token`, `realm_name`, or `username` are used.').optional().meta({ found_in: 'body' }),
  realm_name: Name.describe('The name of an authentication realm. This parameter cannot be used with either `refresh_token` or `token`.').optional().meta({ found_in: 'body' }),
  username: Username.describe('The username of a user. This parameter cannot be used with either `refresh_token` or `token`.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityInvalidateTokenRequest' })
export type SecurityInvalidateTokenRequest = z.infer<typeof SecurityInvalidateTokenRequest>

export const SecurityInvalidateTokenResponse = z.object({
  error_count: long.describe('The number of errors that were encountered when invalidating the tokens.'),
  error_details: z.array(z.lazy(() => ErrorCause)).describe('Details about the errors. This field is not present in the response when `error_count` is `0`.').optional(),
  invalidated_tokens: long.describe('The number of the tokens that were invalidated as part of this request.'),
  previously_invalidated_tokens: long.describe('The number of tokens that were already invalidated.')
}).meta({ id: 'SecurityInvalidateTokenResponse' })
export type SecurityInvalidateTokenResponse = z.infer<typeof SecurityInvalidateTokenResponse>

/**
 * Authenticate OpenID Connect.
 *
 * Exchange an OpenID Connect authentication response message for an Elasticsearch internal access token and refresh token that can be subsequently used for authentication.
 *
 * Elasticsearch exposes all the necessary OpenID Connect related functionality with the OpenID Connect APIs.
 * These APIs are used internally by Kibana in order to provide OpenID Connect based authentication, but can also be used by other, custom web applications or other clients.
 */
export const SecurityOidcAuthenticateRequest = z.object({
  ...RequestBase.shape,
  nonce: z.string().describe('Associate a client session with an ID token and mitigate replay attacks. This value needs to be the same as the one that was provided to the `/_security/oidc/prepare` API or the one that was generated by Elasticsearch and included in the response to that call.').meta({ found_in: 'body' }),
  realm: z.string().describe('The name of the OpenID Connect realm. This property is useful in cases where multiple realms are defined.').optional().meta({ found_in: 'body' }),
  redirect_uri: z.string().describe('The URL to which the OpenID Connect Provider redirected the User Agent in response to an authentication request after a successful authentication. This URL must be provided as-is (URL encoded), taken from the body of the response or as the value of a location header in the response from the OpenID Connect Provider.').meta({ found_in: 'body' }),
  state: z.string().describe('Maintain state between the authentication request and the response. This value needs to be the same as the one that was provided to the `/_security/oidc/prepare` API or the one that was generated by Elasticsearch and included in the response to that call.').meta({ found_in: 'body' })
}).meta({ id: 'SecurityOidcAuthenticateRequest' })
export type SecurityOidcAuthenticateRequest = z.infer<typeof SecurityOidcAuthenticateRequest>

export const SecurityOidcAuthenticateResponse = z.object({
  access_token: z.string().describe('The Elasticsearch access token.'),
  expires_in: integer.describe('The duration (in seconds) of the tokens.'),
  refresh_token: z.string().describe('The Elasticsearch refresh token.'),
  type: z.string().describe('The type of token.')
}).meta({ id: 'SecurityOidcAuthenticateResponse' })
export type SecurityOidcAuthenticateResponse = z.infer<typeof SecurityOidcAuthenticateResponse>

/**
 * Logout of OpenID Connect.
 *
 * Invalidate an access token and a refresh token that were generated as a response to the `/_security/oidc/authenticate` API.
 *
 * If the OpenID Connect authentication realm in Elasticsearch is accordingly configured, the response to this call will contain a URI pointing to the end session endpoint of the OpenID Connect Provider in order to perform single logout.
 *
 * Elasticsearch exposes all the necessary OpenID Connect related functionality with the OpenID Connect APIs.
 * These APIs are used internally by Kibana in order to provide OpenID Connect based authentication, but can also be used by other, custom web applications or other clients.
 */
export const SecurityOidcLogoutRequest = z.object({
  ...RequestBase.shape,
  token: z.string().describe('The access token to be invalidated.').meta({ found_in: 'body' }),
  refresh_token: z.string().describe('The refresh token to be invalidated.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityOidcLogoutRequest' })
export type SecurityOidcLogoutRequest = z.infer<typeof SecurityOidcLogoutRequest>

export const SecurityOidcLogoutResponse = z.object({
  redirect: z.string().describe('A URI that points to the end session endpoint of the OpenID Connect Provider with all the parameters of the logout request as HTTP GET parameters.')
}).meta({ id: 'SecurityOidcLogoutResponse' })
export type SecurityOidcLogoutResponse = z.infer<typeof SecurityOidcLogoutResponse>

/**
 * Prepare OpenID connect authentication.
 *
 * Create an oAuth 2.0 authentication request as a URL string based on the configuration of the OpenID Connect authentication realm in Elasticsearch.
 *
 * The response of this API is a URL pointing to the Authorization Endpoint of the configured OpenID Connect Provider, which can be used to redirect the browser of the user in order to continue the authentication process.
 *
 * Elasticsearch exposes all the necessary OpenID Connect related functionality with the OpenID Connect APIs.
 * These APIs are used internally by Kibana in order to provide OpenID Connect based authentication, but can also be used by other, custom web applications or other clients.
 */
export const SecurityOidcPrepareAuthenticationRequest = z.object({
  ...RequestBase.shape,
  iss: z.string().describe('In the case of a third party initiated single sign on, this is the issuer identifier for the OP that the RP is to send the authentication request to. It cannot be specified when *realm* is specified. One of *realm* or *iss* is required.').optional().meta({ found_in: 'body' }),
  login_hint: z.string().describe('In the case of a third party initiated single sign on, it is a string value that is included in the authentication request as the *login_hint* parameter. This parameter is not valid when *realm* is specified.').optional().meta({ found_in: 'body' }),
  nonce: z.string().describe('The value used to associate a client session with an ID token and to mitigate replay attacks. If the caller of the API does not provide a value, Elasticsearch will generate one with sufficient entropy and return it in the response.').optional().meta({ found_in: 'body' }),
  realm: z.string().describe('The name of the OpenID Connect realm in Elasticsearch the configuration of which should be used in order to generate the authentication request. It cannot be specified when *iss* is specified. One of *realm* or *iss* is required.').optional().meta({ found_in: 'body' }),
  state: z.string().describe('The value used to maintain state between the authentication request and the response, typically used as a Cross-Site Request Forgery mitigation. If the caller of the API does not provide a value, Elasticsearch will generate one with sufficient entropy and return it in the response.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityOidcPrepareAuthenticationRequest' })
export type SecurityOidcPrepareAuthenticationRequest = z.infer<typeof SecurityOidcPrepareAuthenticationRequest>

export const SecurityOidcPrepareAuthenticationResponse = z.object({
  nonce: z.string(),
  realm: z.string(),
  redirect: z.string().describe('A URI that points to the authorization endpoint of the OpenID Connect Provider with all the parameters of the authentication request as HTTP GET parameters.'),
  state: z.string()
}).meta({ id: 'SecurityOidcPrepareAuthenticationResponse' })
export type SecurityOidcPrepareAuthenticationResponse = z.infer<typeof SecurityOidcPrepareAuthenticationResponse>

/**
 * Create or update application privileges.
 *
 * To use this API, you must have one of the following privileges:
 *
 * * The `manage_security` cluster privilege (or a greater privilege such as `all`).
 * * The "Manage Application Privileges" global privilege for the application being referenced in the request.
 *
 * Application names are formed from a prefix, with an optional suffix that conform to the following rules:
 *
 * * The prefix must begin with a lowercase ASCII letter.
 * * The prefix must contain only ASCII letters or digits.
 * * The prefix must be at least 3 characters long.
 * * If the suffix exists, it must begin with either a dash `-` or `_`.
 * * The suffix cannot contain any of the following characters: `\`, `/`, `*`, `?`, `"`, `<`, `>`, `|`, `,`, `*`.
 * * No part of the name can contain whitespace.
 *
 * Privilege names must begin with a lowercase ASCII letter and must contain only ASCII letters and digits along with the characters `_`, `-`, and `.`.
 *
 * Action names can contain any number of printable ASCII characters and must contain at least one of the following characters: `/`, `*`, `:`.
 */
export const SecurityPutPrivilegesRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  privileges: z.record(z.string(), z.record(z.string(), SecurityPutPrivilegesActions)).optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityPutPrivilegesRequest' })
export type SecurityPutPrivilegesRequest = z.infer<typeof SecurityPutPrivilegesRequest>

export const SecurityPutPrivilegesResponse = z.record(z.string(), z.record(z.string(), SecurityCreatedStatus)).meta({ id: 'SecurityPutPrivilegesResponse' })
export type SecurityPutPrivilegesResponse = z.infer<typeof SecurityPutPrivilegesResponse>

/**
 * Create or update roles.
 *
 * The role management APIs are generally the preferred way to manage roles in the native realm, rather than using file-based role management.
 * The create or update roles API cannot update roles that are defined in roles files.
 * File-based role management is not available in Elastic Serverless.
 */
export const SecurityPutRoleRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the role that is being created or updated. On Elasticsearch Serverless, the role name must begin with a letter or digit and can only contain letters, digits and the characters \'_\', \'-\', and \'.\'. Each role must have a unique name, as this will serve as the identifier for that role.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  applications: z.array(SecurityApplicationPrivileges).describe('A list of application privilege entries.').optional().meta({ found_in: 'body' }),
  cluster: z.array(SecurityClusterPrivilege).describe('A list of cluster privileges. These privileges define the cluster-level actions for users with this role.').optional().meta({ found_in: 'body' }),
  indices: z.array(SecurityIndicesPrivileges).describe('A list of indices permissions entries.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Optional metadata. Within the metadata object, keys that begin with an underscore (`_`) are reserved for system use.').optional().meta({ found_in: 'body' }),
  run_as: z.array(z.string()).describe('A list of users that the owners of this role can impersonate. *Note*: in Serverless, the run-as feature is disabled. For API compatibility, you can still specify an empty `run_as` field, but a non-empty list will be rejected.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('Optional description of the role descriptor').optional().meta({ found_in: 'body' }),
  transient_metadata: z.record(z.string(), z.any()).describe('Indicates roles that might be incompatible with the current cluster license, specifically roles with document and field level security. When the cluster license doesn’t allow certain features for a given role, this parameter is updated dynamically to list the incompatible features. If `enabled` is `false`, the role is ignored, but is still listed in the response from the authenticate API.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityPutRoleRequest' })
export type SecurityPutRoleRequest = z.infer<typeof SecurityPutRoleRequest>

export const SecurityPutRoleResponse = z.object({
  role: SecurityCreatedStatus.describe('When an existing role is updated, `created` is set to `false`.')
}).meta({ id: 'SecurityPutRoleResponse' })
export type SecurityPutRoleResponse = z.infer<typeof SecurityPutRoleResponse>

/**
 * Create or update role mappings.
 *
 * Role mappings define which roles are assigned to each user.
 * Each mapping has rules that identify users and a list of roles that are granted to those users.
 * The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files. The create or update role mappings API cannot update role mappings that are defined in role mapping files.
 *
 * NOTE: This API does not create roles. Rather, it maps users to existing roles.
 * Roles can be created by using the create or update roles API or roles files.
 *
 * **Role templates**
 *
 * The most common use for role mappings is to create a mapping from a known value on the user to a fixed role name.
 * For example, all users in the `cn=admin,dc=example,dc=com` LDAP group should be given the superuser role in Elasticsearch.
 * The `roles` field is used for this purpose.
 *
 * For more complex needs, it is possible to use Mustache templates to dynamically determine the names of the roles that should be granted to the user.
 * The `role_templates` field is used for this purpose.
 *
 * NOTE: To use role templates successfully, the relevant scripting feature must be enabled.
 * Otherwise, all attempts to create a role mapping with role templates fail.
 *
 * All of the user fields that are available in the role mapping rules are also available in the role templates.
 * Thus it is possible to assign a user to a role that reflects their username, their groups, or the name of the realm to which they authenticated.
 *
 * By default a template is evaluated to produce a single string that is the name of the role which should be assigned to the user.
 * If the format of the template is set to "json" then the template is expected to produce a JSON string or an array of JSON strings for the role names.
 */
export const SecurityPutRoleMappingRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The distinct name that identifies the role mapping. The name is used solely as an identifier to facilitate interaction via the API; it does not affect the behavior of the mapping in any way.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  enabled: z.boolean().describe('Mappings that have `enabled` set to `false` are ignored when role mapping is performed.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Additional metadata that helps define which roles are assigned to each user. Within the metadata object, keys beginning with `_` are reserved for system usage.').optional().meta({ found_in: 'body' }),
  roles: z.array(z.string()).describe('A list of role names that are granted to the users that match the role mapping rules. Exactly one of `roles` or `role_templates` must be specified.').optional().meta({ found_in: 'body' }),
  role_templates: z.array(SecurityRoleTemplate).describe('A list of Mustache templates that will be evaluated to determine the roles names that should granted to the users that match the role mapping rules. Exactly one of `roles` or `role_templates` must be specified.').optional().meta({ found_in: 'body' }),
  rules: z.lazy(() => SecurityRoleMappingRule).describe('The rules that determine which users should be matched by the mapping. A rule is a logical condition that is expressed by using a JSON DSL.').optional().meta({ found_in: 'body' }),
  run_as: z.array(z.string()).optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityPutRoleMappingRequest' })
export type SecurityPutRoleMappingRequest = z.infer<typeof SecurityPutRoleMappingRequest>

export const SecurityPutRoleMappingResponse = z.object({
  created: z.boolean().optional(),
  role_mapping: SecurityCreatedStatus
}).meta({ id: 'SecurityPutRoleMappingResponse' })
export type SecurityPutRoleMappingResponse = z.infer<typeof SecurityPutRoleMappingResponse>

/**
 * Create or update users.
 *
 * Add and update users in the native realm.
 * A password is required for adding a new user but is optional when updating an existing user.
 * To change a user's password without updating any other fields, use the change password API.
 */
export const SecurityPutUserRequest = z.object({
  ...RequestBase.shape,
  username: Username.describe('An identifier for the user. NOTE: Usernames must be at least 1 and no more than 507 characters. They can contain alphanumeric characters (a-z, A-Z, 0-9), spaces, punctuation, and printable symbols in the Basic Latin (ASCII) block. Leading or trailing whitespace is not allowed.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('Valid values are `true`, `false`, and `wait_for`. These values have the same meaning as in the index API, but the default value for this API is true.').optional().meta({ found_in: 'query' }),
  email: z.union([z.string(), z.null()]).describe('The email of the user.').optional().meta({ found_in: 'body' }),
  full_name: z.union([z.string(), z.null()]).describe('The full name of the user.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata that you want to associate with the user.').optional().meta({ found_in: 'body' }),
  password: Password.describe('The user\'s password. Passwords must be at least 6 characters long. When adding a user, one of `password` or `password_hash` is required. When updating an existing user, the password is optional, so that other fields on the user (such as their roles) may be updated without modifying the user\'s password').optional().meta({ found_in: 'body' }),
  password_hash: z.string().describe('A hash of the user\'s password. This must be produced using the same hashing algorithm as has been configured for password storage. For more details, see the explanation of the `xpack.security.authc.password_hashing.algorithm` setting in the user cache and password hash algorithm documentation. Using this parameter allows the client to pre-hash the password for performance and/or confidentiality reasons. The `password` parameter and the `password_hash` parameter cannot be used in the same request.').optional().meta({ found_in: 'body' }),
  roles: z.array(z.string()).describe('A set of roles the user has. The roles determine the user\'s access permissions. To create a user without any roles, specify an empty list (`[]`).').optional().meta({ found_in: 'body' }),
  enabled: z.boolean().describe('Specifies whether the user is enabled.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityPutUserRequest' })
export type SecurityPutUserRequest = z.infer<typeof SecurityPutUserRequest>

export const SecurityPutUserResponse = z.object({
  created: z.boolean().describe('A successful call returns a JSON structure that shows whether the user has been created or updated. When an existing user is updated, `created` is set to `false`.')
}).meta({ id: 'SecurityPutUserResponse' })
export type SecurityPutUserResponse = z.infer<typeof SecurityPutUserResponse>

export const SecurityQueryApiKeysApiKeyAggregate = z.union([AggregationsCardinalityAggregate, AggregationsValueCountAggregate, AggregationsStringTermsAggregate, AggregationsLongTermsAggregate, AggregationsDoubleTermsAggregate, AggregationsUnmappedTermsAggregate, AggregationsMultiTermsAggregate, AggregationsMissingAggregate, AggregationsFilterAggregate, AggregationsFiltersAggregate, AggregationsRangeAggregate, AggregationsDateRangeAggregate, AggregationsCompositeAggregate]).meta({ id: 'SecurityQueryApiKeysApiKeyAggregate' })
export type SecurityQueryApiKeysApiKeyAggregate = z.infer<typeof SecurityQueryApiKeysApiKeyAggregate>

const SecurityQueryApiKeysApiKeyQueryContainerExclusiveProps = z.union([z.object({ bool: z.lazy(() => QueryDslBoolQuery) }), z.object({ exists: QueryDslExistsQuery }), z.object({ ids: QueryDslIdsQuery }), z.object({ match: z.record(Field, QueryDslMatchQuery) }), z.object({ match_all: QueryDslMatchAllQuery }), z.object({ prefix: z.record(Field, QueryDslPrefixQuery) }), z.object({ range: z.record(Field, QueryDslRangeQuery) }), z.object({ simple_query_string: QueryDslSimpleQueryStringQuery }), z.object({ term: z.record(Field, QueryDslTermQuery) }), z.object({ terms: QueryDslTermsQuery }), z.object({ wildcard: z.record(Field, QueryDslWildcardQuery) })])

export const SecurityQueryApiKeysApiKeyQueryContainer = SecurityQueryApiKeysApiKeyQueryContainerExclusiveProps.meta({ id: 'SecurityQueryApiKeysApiKeyQueryContainer' })
export type SecurityQueryApiKeysApiKeyQueryContainer = z.infer<typeof SecurityQueryApiKeysApiKeyQueryContainer>

export const SecurityQueryApiKeysApiKeyFiltersAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  filters: AggregationsBuckets.describe('Collection of queries from which to build buckets.').optional(),
  other_bucket: z.boolean().describe('Set to `true` to add a bucket to the response which will contain all documents that do not match any of the given filters.').optional(),
  other_bucket_key: z.string().describe('The key with which the other bucket is returned.').optional(),
  keyed: z.boolean().describe('By default, the named filters aggregation returns the buckets as an object. Set to `false` to return the buckets as an array of objects.').optional()
}).meta({ id: 'SecurityQueryApiKeysApiKeyFiltersAggregation' })
export type SecurityQueryApiKeysApiKeyFiltersAggregation = z.infer<typeof SecurityQueryApiKeysApiKeyFiltersAggregation>

const SecurityQueryApiKeysApiKeyAggregationContainerCommonProps = z.object({
  aggregations: z.record(z.string(), z.lazy(() => SecurityQueryApiKeysApiKeyAggregationContainer)).describe('Sub-aggregations for this aggregation. Only applies to bucket aggregations.').optional(),
  aggs: z.record(z.string(), z.lazy(() => SecurityQueryApiKeysApiKeyAggregationContainer)).describe('Sub-aggregations for this aggregation. Only applies to bucket aggregations.').optional(),
  meta: Metadata.optional()
})

const SecurityQueryApiKeysApiKeyAggregationContainerExclusiveProps = z.union([z.object({ cardinality: z.lazy(() => AggregationsCardinalityAggregation) }), z.object({ composite: z.lazy(() => AggregationsCompositeAggregation) }), z.object({ date_range: AggregationsDateRangeAggregation }), z.object({ filter: SecurityQueryApiKeysApiKeyQueryContainer }), z.object({ filters: SecurityQueryApiKeysApiKeyFiltersAggregation }), z.object({ missing: AggregationsMissingAggregation }), z.object({ range: z.lazy(() => AggregationsRangeAggregation) }), z.object({ terms: z.lazy(() => AggregationsTermsAggregation) }), z.object({ value_count: z.lazy(() => AggregationsValueCountAggregation) })])

export interface SecurityQueryApiKeysApiKeyAggregationContainerShape {
  aggregations?: Record<string, SecurityQueryApiKeysApiKeyAggregationContainerShape> | undefined
  meta?: Metadata | undefined
  cardinality?: AggregationsCardinalityAggregation | undefined
  composite?: AggregationsCompositeAggregation | undefined
  date_range?: AggregationsDateRangeAggregation | undefined
  filter?: SecurityQueryApiKeysApiKeyQueryContainer | undefined
  filters?: SecurityQueryApiKeysApiKeyFiltersAggregation | undefined
  missing?: AggregationsMissingAggregation | undefined
  range?: AggregationsRangeAggregation | undefined
  terms?: AggregationsTermsAggregation | undefined
  value_count?: AggregationsValueCountAggregation | undefined
}
export const SecurityQueryApiKeysApiKeyAggregationContainer: z.ZodType<SecurityQueryApiKeysApiKeyAggregationContainerShape> = SecurityQueryApiKeysApiKeyAggregationContainerCommonProps.and(SecurityQueryApiKeysApiKeyAggregationContainerExclusiveProps).meta({ id: 'SecurityQueryApiKeysApiKeyAggregationContainer' })
export type SecurityQueryApiKeysApiKeyAggregationContainer = z.infer<typeof SecurityQueryApiKeysApiKeyAggregationContainer>

/**
 * Find API keys with a query.
 *
 * Get a paginated list of API keys and their information.
 * You can optionally filter the results with a query.
 *
 * To use this API, you must have at least the `manage_own_api_key` or the `read_security` cluster privileges.
 * If you have only the `manage_own_api_key` privilege, this API returns only the API keys that you own.
 * If you have the `read_security`, `manage_api_key`, or greater privileges (including `manage_security`), this API returns all API keys regardless of ownership.
 * Refer to the linked documentation for examples of how to find API keys:
 */
export const SecurityQueryApiKeysRequest = z.object({
  ...RequestBase.shape,
  with_limited_by: z.boolean().describe('Return the snapshot of the owner user\'s role descriptors associated with the API key. An API key\'s actual permission is the intersection of its assigned role descriptors and the owner user\'s role descriptors (effectively limited by it). An API key cannot retrieve any API key’s limited-by role descriptors (including itself) unless it has `manage_api_key` or higher privileges.').optional().meta({ found_in: 'query' }),
  with_profile_uid: z.boolean().describe('Determines whether to also retrieve the profile UID for the API key owner principal. If it exists, the profile UID is returned under the `profile_uid` response field for each API key.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('Determines whether aggregation names are prefixed by their respective types in the response.').optional().meta({ found_in: 'query' }),
  aggregations: z.record(z.string(), z.lazy(() => SecurityQueryApiKeysApiKeyAggregationContainer)).describe('Any aggregations to run over the corpus of returned API keys. Aggregations and queries work together. Aggregations are computed only on the API keys that match the query. This supports only a subset of aggregation types, namely: `terms`, `range`, `date_range`, `missing`, `cardinality`, `value_count`, `composite`, `filter`, and `filters`. Additionally, aggregations only run over the same subset of fields that query works with.').optional().meta({ found_in: 'body' }),
  aggs: z.record(z.string(), z.lazy(() => SecurityQueryApiKeysApiKeyAggregationContainer)).describe('Any aggregations to run over the corpus of returned API keys. Aggregations and queries work together. Aggregations are computed only on the API keys that match the query. This supports only a subset of aggregation types, namely: `terms`, `range`, `date_range`, `missing`, `cardinality`, `value_count`, `composite`, `filter`, and `filters`. Additionally, aggregations only run over the same subset of fields that query works with.').optional(),
  query: SecurityQueryApiKeysApiKeyQueryContainer.describe('A query to filter which API keys to return. If the query parameter is missing, it is equivalent to a `match_all` query. The query supports a subset of query types, including `match_all`, `bool`, `term`, `terms`, `match`, `ids`, `prefix`, `wildcard`, `exists`, `range`, and `simple_query_string`. You can query the following public information associated with an API key: `id`, `type`, `name`, `creation`, `expiration`, `invalidated`, `invalidation`, `username`, `realm`, and `metadata`. NOTE: The queryable string values associated with API keys are internally mapped as keywords. Consequently, if no `analyzer` parameter is specified for a `match` query, then the provided match query string is interpreted as a single keyword value. Such a match query is hence equivalent to a `term` query.').optional().meta({ found_in: 'body' }),
  from: integer.describe('The starting document offset. It must not be negative. By default, you cannot page through more than 10,000 hits using the `from` and `size` parameters. To page through more hits, use the `search_after` parameter.').optional().meta({ found_in: 'body' }),
  sort: z.lazy(() => Sort).describe('The sort definition. Other than `id`, all public fields of an API key are eligible for sorting. In addition, sort can also be applied to the `_doc` field to sort by index order.').optional().meta({ found_in: 'body' }),
  size: integer.describe('The number of hits to return. It must not be negative. The `size` parameter can be set to `0`, in which case no API key matches are returned, only the aggregation results. By default, you cannot page through more than 10,000 hits using the `from` and `size` parameters. To page through more hits, use the `search_after` parameter.').optional().meta({ found_in: 'body' }),
  search_after: SortResults.describe('The search after definition.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityQueryApiKeysRequest' })
export type SecurityQueryApiKeysRequest = z.infer<typeof SecurityQueryApiKeysRequest>

export const SecurityQueryApiKeysResponse = z.object({
  total: integer.describe('The total number of API keys found.'),
  count: integer.describe('The number of API keys returned in the response.'),
  api_keys: z.array(SecurityApiKey).describe('A list of API key information.'),
  aggregations: z.record(AggregateName, SecurityQueryApiKeysApiKeyAggregate).describe('The aggregations result, if requested.').optional()
}).meta({ id: 'SecurityQueryApiKeysResponse' })
export type SecurityQueryApiKeysResponse = z.infer<typeof SecurityQueryApiKeysResponse>

export const SecurityQueryRoleQueryRole = z.object({
  ...SecurityRoleDescriptor.shape,
  _sort: SortResults.optional(),
  name: z.string().describe('Name of the role.')
}).meta({ id: 'SecurityQueryRoleQueryRole' })
export type SecurityQueryRoleQueryRole = z.infer<typeof SecurityQueryRoleQueryRole>

const SecurityQueryRoleRoleQueryContainerExclusiveProps = z.union([z.object({ bool: z.lazy(() => QueryDslBoolQuery) }), z.object({ exists: QueryDslExistsQuery }), z.object({ ids: QueryDslIdsQuery }), z.object({ match: z.record(Field, QueryDslMatchQuery) }), z.object({ match_all: QueryDslMatchAllQuery }), z.object({ prefix: z.record(Field, QueryDslPrefixQuery) }), z.object({ range: z.record(Field, QueryDslRangeQuery) }), z.object({ simple_query_string: QueryDslSimpleQueryStringQuery }), z.object({ term: z.record(Field, QueryDslTermQuery) }), z.object({ terms: QueryDslTermsQuery }), z.object({ wildcard: z.record(Field, QueryDslWildcardQuery) })])

export const SecurityQueryRoleRoleQueryContainer = SecurityQueryRoleRoleQueryContainerExclusiveProps.meta({ id: 'SecurityQueryRoleRoleQueryContainer' })
export type SecurityQueryRoleRoleQueryContainer = z.infer<typeof SecurityQueryRoleRoleQueryContainer>

/**
 * Find roles with a query.
 *
 * Get roles in a paginated manner.
 * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
 * The query roles API does not retrieve roles that are defined in roles files, nor built-in ones.
 * You can optionally filter the results with a query.
 * Also, the results can be paginated and sorted.
 */
export const SecurityQueryRoleRequest = z.object({
  ...RequestBase.shape,
  query: SecurityQueryRoleRoleQueryContainer.describe('A query to filter which roles to return. If the query parameter is missing, it is equivalent to a `match_all` query. The query supports a subset of query types, including `match_all`, `bool`, `term`, `terms`, `match`, `ids`, `prefix`, `wildcard`, `exists`, `range`, and `simple_query_string`. You can query the following information associated with roles: `name`, `description`, `metadata`, `applications.application`, `applications.privileges`, and `applications.resources`.').optional().meta({ found_in: 'body' }),
  from: integer.describe('The starting document offset. It must not be negative. By default, you cannot page through more than 10,000 hits using the `from` and `size` parameters. To page through more hits, use the `search_after` parameter.').optional().meta({ found_in: 'body' }),
  sort: z.lazy(() => Sort).describe('The sort definition. You can sort on `name`, `description`, `metadata`, `applications.application`, `applications.privileges`, and `applications.resources`. In addition, sort can also be applied to the `_doc` field to sort by index order.').optional().meta({ found_in: 'body' }),
  size: integer.describe('The number of hits to return. It must not be negative. By default, you cannot page through more than 10,000 hits using the `from` and `size` parameters. To page through more hits, use the `search_after` parameter.').optional().meta({ found_in: 'body' }),
  search_after: SortResults.describe('The search after definition.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityQueryRoleRequest' })
export type SecurityQueryRoleRequest = z.infer<typeof SecurityQueryRoleRequest>

export const SecurityQueryRoleResponse = z.object({
  total: integer.describe('The total number of roles found.'),
  count: integer.describe('The number of roles returned in the response.'),
  roles: z.array(SecurityQueryRoleQueryRole).describe('A list of roles that match the query. The returned role format is an extension of the role definition format. It adds the `transient_metadata.enabled` and the `_sort` fields. `transient_metadata.enabled` is set to `false` in case the role is automatically disabled, for example when the role grants privileges that are not allowed by the installed license. `_sort` is present when the search query sorts on some field. It contains the array of values that have been used for sorting.')
}).meta({ id: 'SecurityQueryRoleResponse' })
export type SecurityQueryRoleResponse = z.infer<typeof SecurityQueryRoleResponse>

export const SecurityQueryUserQueryUser = z.object({
  ...SecurityUser.shape,
  _sort: SortResults.optional()
}).meta({ id: 'SecurityQueryUserQueryUser' })
export type SecurityQueryUserQueryUser = z.infer<typeof SecurityQueryUserQueryUser>

const SecurityQueryUserUserQueryContainerExclusiveProps = z.union([z.object({ ids: QueryDslIdsQuery }), z.object({ bool: z.lazy(() => QueryDslBoolQuery) }), z.object({ exists: QueryDslExistsQuery }), z.object({ match: z.record(Field, QueryDslMatchQuery) }), z.object({ match_all: QueryDslMatchAllQuery }), z.object({ prefix: z.record(Field, QueryDslPrefixQuery) }), z.object({ range: z.record(Field, QueryDslRangeQuery) }), z.object({ simple_query_string: QueryDslSimpleQueryStringQuery }), z.object({ term: z.record(Field, QueryDslTermQuery) }), z.object({ terms: QueryDslTermsQuery }), z.object({ wildcard: z.record(Field, QueryDslWildcardQuery) })])

export const SecurityQueryUserUserQueryContainer = SecurityQueryUserUserQueryContainerExclusiveProps.meta({ id: 'SecurityQueryUserUserQueryContainer' })
export type SecurityQueryUserUserQueryContainer = z.infer<typeof SecurityQueryUserUserQueryContainer>

/**
 * Find users with a query.
 *
 * Get information for users in a paginated manner.
 * You can optionally filter the results with a query.
 *
 * NOTE: As opposed to the get user API, built-in users are excluded from the result.
 * This API is only for native users.
 */
export const SecurityQueryUserRequest = z.object({
  ...RequestBase.shape,
  with_profile_uid: z.boolean().describe('Determines whether to retrieve the user profile UID, if it exists, for the users.').optional().meta({ found_in: 'query' }),
  query: SecurityQueryUserUserQueryContainer.describe('A query to filter which users to return. If the query parameter is missing, it is equivalent to a `match_all` query. The query supports a subset of query types, including `match_all`, `bool`, `term`, `terms`, `match`, `ids`, `prefix`, `wildcard`, `exists`, `range`, and `simple_query_string`. You can query the following information associated with user: `username`, `roles`, `enabled`, `full_name`, and `email`.').optional().meta({ found_in: 'body' }),
  from: integer.describe('The starting document offset. It must not be negative. By default, you cannot page through more than 10,000 hits using the `from` and `size` parameters. To page through more hits, use the `search_after` parameter.').optional().meta({ found_in: 'body' }),
  sort: z.lazy(() => Sort).describe('The sort definition. Fields eligible for sorting are: `username`, `roles`, `enabled`. In addition, sort can also be applied to the `_doc` field to sort by index order.').optional().meta({ found_in: 'body' }),
  size: integer.describe('The number of hits to return. It must not be negative. By default, you cannot page through more than 10,000 hits using the `from` and `size` parameters. To page through more hits, use the `search_after` parameter.').optional().meta({ found_in: 'body' }),
  search_after: SortResults.describe('The search after definition').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityQueryUserRequest' })
export type SecurityQueryUserRequest = z.infer<typeof SecurityQueryUserRequest>

export const SecurityQueryUserResponse = z.object({
  total: integer.describe('The total number of users found.'),
  count: integer.describe('The number of users returned in the response.'),
  users: z.array(SecurityQueryUserQueryUser).describe('A list of users that match the query.')
}).meta({ id: 'SecurityQueryUserResponse' })
export type SecurityQueryUserResponse = z.infer<typeof SecurityQueryUserResponse>

/**
 * Authenticate SAML.
 *
 * Submit a SAML response message to Elasticsearch for consumption.
 *
 * NOTE: This API is intended for use by custom web applications other than Kibana.
 * If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.
 *
 * The SAML message that is submitted can be:
 *
 * * A response to a SAML authentication request that was previously created using the SAML prepare authentication API.
 * * An unsolicited SAML message in the case of an IdP-initiated single sign-on (SSO) flow.
 *
 * In either case, the SAML message needs to be a base64 encoded XML document with a root element of `<Response>`.
 *
 * After successful validation, Elasticsearch responds with an Elasticsearch internal access token and refresh token that can be subsequently used for authentication.
 * This API endpoint essentially exchanges SAML responses that indicate successful authentication in the IdP for Elasticsearch access and refresh tokens, which can be used for authentication against Elasticsearch.
 */
export const SecuritySamlAuthenticateRequest = z.object({
  ...RequestBase.shape,
  content: z.string().describe('The SAML response as it was sent by the user\'s browser, usually a Base64 encoded XML document.').meta({ found_in: 'body' }),
  ids: Ids.describe('A JSON array with all the valid SAML Request Ids that the caller of the API has for the current user.').meta({ found_in: 'body' }),
  realm: z.string().describe('The name of the realm that should authenticate the SAML response. Useful in cases where many SAML realms are defined.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySamlAuthenticateRequest' })
export type SecuritySamlAuthenticateRequest = z.infer<typeof SecuritySamlAuthenticateRequest>

export const SecuritySamlAuthenticateResponse = z.object({
  access_token: z.string().describe('The access token that was generated by Elasticsearch.'),
  username: z.string().describe('The authenticated user\'s name.'),
  expires_in: integer.describe('The amount of time (in seconds) left until the token expires.'),
  refresh_token: z.string().describe('The refresh token that was generated by Elasticsearch.'),
  realm: z.string().describe('The name of the realm where the user was authenticated.'),
  in_response_to: z.string().describe('The id of the request that initiated the authentication process.').optional()
}).meta({ id: 'SecuritySamlAuthenticateResponse' })
export type SecuritySamlAuthenticateResponse = z.infer<typeof SecuritySamlAuthenticateResponse>

/**
 * Logout of SAML completely.
 *
 * Verifies the logout response sent from the SAML IdP.
 *
 * NOTE: This API is intended for use by custom web applications other than Kibana.
 * If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.
 *
 * The SAML IdP may send a logout response back to the SP after handling the SP-initiated SAML Single Logout.
 * This API verifies the response by ensuring the content is relevant and validating its signature.
 * An empty response is returned if the verification process is successful.
 * The response can be sent by the IdP with either the HTTP-Redirect or the HTTP-Post binding.
 * The caller of this API must prepare the request accordingly so that this API can handle either of them.
 */
export const SecuritySamlCompleteLogoutRequest = z.object({
  ...RequestBase.shape,
  realm: z.string().describe('The name of the SAML realm in Elasticsearch for which the configuration is used to verify the logout response.').meta({ found_in: 'body' }),
  ids: Ids.describe('A JSON array with all the valid SAML Request Ids that the caller of the API has for the current user.').meta({ found_in: 'body' }),
  query_string: z.string().describe('If the SAML IdP sends the logout response with the HTTP-Redirect binding, this field must be set to the query string of the redirect URI.').optional().meta({ found_in: 'body' }),
  content: z.string().describe('If the SAML IdP sends the logout response with the HTTP-Post binding, this field must be set to the value of the SAMLResponse form parameter from the logout response.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySamlCompleteLogoutRequest' })
export type SecuritySamlCompleteLogoutRequest = z.infer<typeof SecuritySamlCompleteLogoutRequest>

export const SecuritySamlCompleteLogoutResponse = z.boolean().meta({ id: 'SecuritySamlCompleteLogoutResponse' })
export type SecuritySamlCompleteLogoutResponse = z.infer<typeof SecuritySamlCompleteLogoutResponse>

/**
 * Invalidate SAML.
 *
 * Submit a SAML LogoutRequest message to Elasticsearch for consumption.
 *
 * NOTE: This API is intended for use by custom web applications other than Kibana.
 * If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.
 *
 * The logout request comes from the SAML IdP during an IdP initiated Single Logout.
 * The custom web application can use this API to have Elasticsearch process the `LogoutRequest`.
 * After successful validation of the request, Elasticsearch invalidates the access token and refresh token that corresponds to that specific SAML principal and provides a URL that contains a SAML LogoutResponse message.
 * Thus the user can be redirected back to their IdP.
 */
export const SecuritySamlInvalidateRequest = z.object({
  ...RequestBase.shape,
  acs: z.string().describe('The Assertion Consumer Service URL that matches the one of the SAML realm in Elasticsearch that should be used. You must specify either this parameter or the `realm` parameter.').optional().meta({ found_in: 'body' }),
  query_string: z.string().describe('The query part of the URL that the user was redirected to by the SAML IdP to initiate the Single Logout. This query should include a single parameter named `SAMLRequest` that contains a SAML logout request that is deflated and Base64 encoded. If the SAML IdP has signed the logout request, the URL should include two extra parameters named `SigAlg` and `Signature` that contain the algorithm used for the signature and the signature value itself. In order for Elasticsearch to be able to verify the IdP\'s signature, the value of the `query_string` field must be an exact match to the string provided by the browser. The client application must not attempt to parse or process the string in any way.').meta({ found_in: 'body' }),
  realm: z.string().describe('The name of the SAML realm in Elasticsearch the configuration. You must specify either this parameter or the `acs` parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySamlInvalidateRequest' })
export type SecuritySamlInvalidateRequest = z.infer<typeof SecuritySamlInvalidateRequest>

export const SecuritySamlInvalidateResponse = z.object({
  invalidated: integer.describe('The number of tokens that were invalidated as part of this logout.'),
  realm: z.string().describe('The realm name of the SAML realm in Elasticsearch that authenticated the user.'),
  redirect: z.string().describe('A SAML logout response as a parameter so that the user can be redirected back to the SAML IdP.')
}).meta({ id: 'SecuritySamlInvalidateResponse' })
export type SecuritySamlInvalidateResponse = z.infer<typeof SecuritySamlInvalidateResponse>

/**
 * Logout of SAML.
 *
 * Submits a request to invalidate an access token and refresh token.
 *
 * NOTE: This API is intended for use by custom web applications other than Kibana.
 * If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.
 *
 * This API invalidates the tokens that were generated for a user by the SAML authenticate API.
 * If the SAML realm in Elasticsearch is configured accordingly and the SAML IdP supports this, the Elasticsearch response contains a URL to redirect the user to the IdP that contains a SAML logout request (starting an SP-initiated SAML Single Logout).
 */
export const SecuritySamlLogoutRequest = z.object({
  ...RequestBase.shape,
  token: z.string().describe('The access token that was returned as a response to calling the SAML authenticate API. Alternatively, the most recent token that was received after refreshing the original one by using a `refresh_token`.').meta({ found_in: 'body' }),
  refresh_token: z.string().describe('The refresh token that was returned as a response to calling the SAML authenticate API. Alternatively, the most recent refresh token that was received after refreshing the original access token.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySamlLogoutRequest' })
export type SecuritySamlLogoutRequest = z.infer<typeof SecuritySamlLogoutRequest>

export const SecuritySamlLogoutResponse = z.object({
  redirect: z.string().describe('A URL that contains a SAML logout request as a parameter. You can use this URL to be redirected back to the SAML IdP and to initiate Single Logout.')
}).meta({ id: 'SecuritySamlLogoutResponse' })
export type SecuritySamlLogoutResponse = z.infer<typeof SecuritySamlLogoutResponse>

/**
 * Prepare SAML authentication.
 *
 * Create a SAML authentication request (`<AuthnRequest>`) as a URL string based on the configuration of the respective SAML realm in Elasticsearch.
 *
 * NOTE: This API is intended for use by custom web applications other than Kibana.
 * If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.
 *
 * This API returns a URL pointing to the SAML Identity Provider.
 * You can use the URL to redirect the browser of the user in order to continue the authentication process.
 * The URL includes a single parameter named `SAMLRequest`, which contains a SAML Authentication request that is deflated and Base64 encoded.
 * If the configuration dictates that SAML authentication requests should be signed, the URL has two extra parameters named `SigAlg` and `Signature`.
 * These parameters contain the algorithm used for the signature and the signature value itself.
 * It also returns a random string that uniquely identifies this SAML Authentication request.
 * The caller of this API needs to store this identifier as it needs to be used in a following step of the authentication process.
 */
export const SecuritySamlPrepareAuthenticationRequest = z.object({
  ...RequestBase.shape,
  acs: z.string().describe('The Assertion Consumer Service URL that matches the one of the SAML realms in Elasticsearch. The realm is used to generate the authentication request. You must specify either this parameter or the `realm` parameter.').optional().meta({ found_in: 'body' }),
  realm: z.string().describe('The name of the SAML realm in Elasticsearch for which the configuration is used to generate the authentication request. You must specify either this parameter or the `acs` parameter.').optional().meta({ found_in: 'body' }),
  relay_state: z.string().describe('A string that will be included in the redirect URL that this API returns as the `RelayState` query parameter. If the Authentication Request is signed, this value is used as part of the signature computation.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySamlPrepareAuthenticationRequest' })
export type SecuritySamlPrepareAuthenticationRequest = z.infer<typeof SecuritySamlPrepareAuthenticationRequest>

export const SecuritySamlPrepareAuthenticationResponse = z.object({
  id: Id.describe('A unique identifier for the SAML Request to be stored by the caller of the API.'),
  realm: z.string().describe('The name of the Elasticsearch realm that was used to construct the authentication request.'),
  redirect: z.string().describe('The URL to redirect the user to.')
}).meta({ id: 'SecuritySamlPrepareAuthenticationResponse' })
export type SecuritySamlPrepareAuthenticationResponse = z.infer<typeof SecuritySamlPrepareAuthenticationResponse>

/**
 * Create SAML service provider metadata.
 *
 * Generate SAML metadata for a SAML 2.0 Service Provider.
 *
 * The SAML 2.0 specification provides a mechanism for Service Providers to describe their capabilities and configuration using a metadata file.
 * This API generates Service Provider metadata based on the configuration of a SAML realm in Elasticsearch.
 */
export const SecuritySamlServiceProviderMetadataRequest = z.object({
  ...RequestBase.shape,
  realm_name: Name.describe('The name of the SAML realm in Elasticsearch.').meta({ found_in: 'path' })
}).meta({ id: 'SecuritySamlServiceProviderMetadataRequest' })
export type SecuritySamlServiceProviderMetadataRequest = z.infer<typeof SecuritySamlServiceProviderMetadataRequest>

export const SecuritySamlServiceProviderMetadataResponse = z.object({
  metadata: z.string().describe('An XML string that contains a SAML Service Provider\'s metadata for the realm.')
}).meta({ id: 'SecuritySamlServiceProviderMetadataResponse' })
export type SecuritySamlServiceProviderMetadataResponse = z.infer<typeof SecuritySamlServiceProviderMetadataResponse>

export const SecuritySuggestUserProfilesHint = z.object({
  uids: z.array(SecurityUserProfileId).describe('A list of profile UIDs to match against.').optional(),
  labels: z.record(z.string(), z.union([z.string(), z.array(z.string())])).describe('A single key-value pair to match against the labels section of a profile. A profile is considered matching if it matches at least one of the strings.').optional()
}).meta({ id: 'SecuritySuggestUserProfilesHint' })
export type SecuritySuggestUserProfilesHint = z.infer<typeof SecuritySuggestUserProfilesHint>

/**
 * Suggest a user profile.
 *
 * Get suggestions for user profiles that match specified search criteria.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 */
export const SecuritySuggestUserProfilesRequest = z.object({
  ...RequestBase.shape,
  name: z.string().describe('A query string used to match name-related fields in user profile documents. Name-related fields are the user\'s `username`, `full_name`, and `email`.').optional().meta({ found_in: 'body' }),
  size: long.describe('The number of profiles to return.').optional().meta({ found_in: 'body' }),
  data: z.union([z.string(), z.array(z.string())]).describe('A comma-separated list of filters for the `data` field of the profile document. To return all content use `data=*`. To return a subset of content, use `data=<key>` to retrieve content nested under the specified `<key>`. By default, the API returns no `data` content. It is an error to specify `data` as both the query parameter and the request body field.').optional().meta({ found_in: 'body' }),
  hint: SecuritySuggestUserProfilesHint.describe('Extra search criteria to improve relevance of the suggestion result. Profiles matching the spcified hint are ranked higher in the response. Profiles not matching the hint aren\'t excluded from the response as long as the profile matches the `name` field query.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySuggestUserProfilesRequest' })
export type SecuritySuggestUserProfilesRequest = z.infer<typeof SecuritySuggestUserProfilesRequest>

export const SecuritySuggestUserProfilesTotalUserProfiles = z.object({
  value: long,
  relation: RelationName
}).meta({ id: 'SecuritySuggestUserProfilesTotalUserProfiles' })
export type SecuritySuggestUserProfilesTotalUserProfiles = z.infer<typeof SecuritySuggestUserProfilesTotalUserProfiles>

export const SecuritySuggestUserProfilesResponse = z.object({
  total: SecuritySuggestUserProfilesTotalUserProfiles.describe('Metadata about the number of matching profiles.'),
  took: long.describe('The number of milliseconds it took Elasticsearch to run the request.'),
  profiles: z.array(SecurityUserProfile).describe('A list of profile documents, ordered by relevance, that match the search criteria.')
}).meta({ id: 'SecuritySuggestUserProfilesResponse' })
export type SecuritySuggestUserProfilesResponse = z.infer<typeof SecuritySuggestUserProfilesResponse>

/**
 * Update an API key.
 *
 * Update attributes of an existing API key.
 * This API supports updates to an API key's access scope, expiration, and metadata.
 *
 * To use this API, you must have at least the `manage_own_api_key` cluster privilege.
 * Users can only update API keys that they created or that were granted to them.
 * To update another user’s API key, use the `run_as` feature to submit a request on behalf of another user.
 *
 * IMPORTANT: It's not possible to use an API key as the authentication credential for this API. The owner user’s credentials are required.
 *
 * Use this API to update API keys created by the create API key or grant API Key APIs.
 * If you need to apply the same update to many API keys, you can use the bulk update API keys API to reduce overhead.
 * It's not possible to update expired API keys or API keys that have been invalidated by the invalidate API key API.
 *
 * The access scope of an API key is derived from the `role_descriptors` you specify in the request and a snapshot of the owner user's permissions at the time of the request.
 * The snapshot of the owner's permissions is updated automatically on every call.
 *
 * IMPORTANT: If you don't specify `role_descriptors` in the request, a call to this API might still change the API key's access scope.
 * This change can occur if the owner user's permissions have changed since the API key was created or last modified.
 */
export const SecurityUpdateApiKeyRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The ID of the API key to update.').meta({ found_in: 'path' }),
  role_descriptors: z.record(z.string(), SecurityRoleDescriptor).describe('The role descriptors to assign to this API key. The API key\'s effective permissions are an intersection of its assigned privileges and the point in time snapshot of permissions of the owner user. You can assign new privileges by specifying them in this parameter. To remove assigned privileges, you can supply an empty `role_descriptors` parameter, that is to say, an empty object `{}`. If an API key has no assigned privileges, it inherits the owner user\'s full permissions. The snapshot of the owner\'s permissions is always updated, whether you supply the `role_descriptors` parameter or not. The structure of a role descriptor is the same as the request for the create API keys API.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata that you want to associate with the API key. It supports a nested data structure. Within the metadata object, keys beginning with `_` are reserved for system usage. When specified, this value fully replaces the metadata previously associated with the API key.').optional().meta({ found_in: 'body' }),
  expiration: Duration.describe('The expiration time for the API key. By default, API keys never expire. This property can be omitted to leave the expiration unchanged.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityUpdateApiKeyRequest' })
export type SecurityUpdateApiKeyRequest = z.infer<typeof SecurityUpdateApiKeyRequest>

export const SecurityUpdateApiKeyResponse = z.object({
  updated: z.boolean().describe('If `true`, the API key was updated. If `false`, the API key didn\'t change because no change was detected.')
}).meta({ id: 'SecurityUpdateApiKeyResponse' })
export type SecurityUpdateApiKeyResponse = z.infer<typeof SecurityUpdateApiKeyResponse>

/**
 * Update a cross-cluster API key.
 *
 * Update the attributes of an existing cross-cluster API key, which is used for API key based remote cluster access.
 *
 * To use this API, you must have at least the `manage_security` cluster privilege.
 * Users can only update API keys that they created.
 * To update another user's API key, use the `run_as` feature to submit a request on behalf of another user.
 *
 * IMPORTANT: It's not possible to use an API key as the authentication credential for this API.
 * To update an API key, the owner user's credentials are required.
 *
 * It's not possible to update expired API keys, or API keys that have been invalidated by the invalidate API key API.
 *
 * This API supports updates to an API key's access scope, metadata, and expiration.
 * The owner user's information, such as the `username` and `realm`, is also updated automatically on every call.
 *
 * NOTE: This API cannot update REST API keys, which should be updated by either the update API key or bulk update API keys API.
 *
 * To learn more about how to use this API, refer to the [Update cross cluter API key API examples page](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/update-cc-api-key-examples).
 */
export const SecurityUpdateCrossClusterApiKeyRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The ID of the cross-cluster API key to update.').meta({ found_in: 'path' }),
  access: SecurityAccess.describe('The access to be granted to this API key. The access is composed of permissions for cross cluster search and cross cluster replication. At least one of them must be specified. When specified, the new access assignment fully replaces the previously assigned access.').meta({ found_in: 'body' }),
  expiration: Duration.describe('The expiration time for the API key. By default, API keys never expire. This property can be omitted to leave the value unchanged.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata that you want to associate with the API key. It supports nested data structure. Within the metadata object, keys beginning with `_` are reserved for system usage. When specified, this information fully replaces metadata previously associated with the API key.').optional().meta({ found_in: 'body' }),
  certificate_identity: z.string().describe('The certificate identity to associate with this API key. This field is used to restrict the API key to connections authenticated by a specific TLS certificate. The value should match the certificate\'s distinguished name (DN) pattern. When specified, this fully replaces any previously assigned certificate identity. To clear an existing certificate identity, explicitly set this field to `null`. When omitted, the existing certificate identity remains unchanged.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityUpdateCrossClusterApiKeyRequest' })
export type SecurityUpdateCrossClusterApiKeyRequest = z.infer<typeof SecurityUpdateCrossClusterApiKeyRequest>

export const SecurityUpdateCrossClusterApiKeyResponse = z.object({
  updated: z.boolean().describe('If `true`, the API key was updated. If `false`, the API key didn’t change because no change was detected.')
}).meta({ id: 'SecurityUpdateCrossClusterApiKeyResponse' })
export type SecurityUpdateCrossClusterApiKeyResponse = z.infer<typeof SecurityUpdateCrossClusterApiKeyResponse>

/**
 * Update security index settings.
 *
 * Update the user-configurable settings for the security internal index (`.security` and associated indices). Only a subset of settings are allowed to be modified. This includes `index.auto_expand_replicas` and `index.number_of_replicas`.
 *
 * NOTE: If `index.auto_expand_replicas` is set, `index.number_of_replicas` will be ignored during updates.
 *
 * If a specific index is not in use on the system and settings are provided for it, the request will be rejected.
 * This API does not yet support configuring the settings for indices before they are in use.
 */
export const SecurityUpdateSettingsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  security: SecuritySecuritySettings.describe('Settings for the index used for most security configuration, including native realm users and roles configured with the API.').optional().meta({ found_in: 'body' }),
  'security-profile': SecuritySecuritySettings.describe('Settings for the index used to store profile information.').optional(),
  'security-tokens': SecuritySecuritySettings.describe('Settings for the index used to store tokens.').optional()
}).meta({ id: 'SecurityUpdateSettingsRequest' })
export type SecurityUpdateSettingsRequest = z.infer<typeof SecurityUpdateSettingsRequest>

export const SecurityUpdateSettingsResponse = z.object({
  acknowledged: z.boolean()
}).meta({ id: 'SecurityUpdateSettingsResponse' })
export type SecurityUpdateSettingsResponse = z.infer<typeof SecurityUpdateSettingsResponse>

/**
 * Update user profile data.
 *
 * Update specific data for the user profile that is associated with a unique ID.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 *
 * To use this API, you must have one of the following privileges:
 *
 * * The `manage_user_profile` cluster privilege.
 * * The `update_profile_data` global privilege for the namespaces that are referenced in the request.
 *
 * This API updates the `labels` and `data` fields of an existing user profile document with JSON objects.
 * New keys and their values are added to the profile document and conflicting keys are replaced by data that's included in the request.
 *
 * For both labels and data, content is namespaced by the top-level fields.
 * The `update_profile_data` global privilege grants privileges for updating only the allowed namespaces.
 */
export const SecurityUpdateUserProfileDataRequest = z.object({
  ...RequestBase.shape,
  uid: SecurityUserProfileId.describe('A unique identifier for the user profile.').meta({ found_in: 'path' }),
  if_seq_no: SequenceNumber.describe('Only perform the operation if the document has this sequence number.').optional().meta({ found_in: 'query' }),
  if_primary_term: long.describe('Only perform the operation if the document has this primary term.').optional().meta({ found_in: 'query' }),
  refresh: Refresh.describe('If \'true\', Elasticsearch refreshes the affected shards to make this operation visible to search. If \'wait_for\', it waits for a refresh to make this operation visible to search. If \'false\', nothing is done with refreshes.').optional().meta({ found_in: 'query' }),
  labels: z.record(z.string(), z.any()).describe('Searchable data that you want to associate with the user profile. This field supports a nested data structure. Within the labels object, top-level keys cannot begin with an underscore (`_`) or contain a period (`.`).').optional().meta({ found_in: 'body' }),
  data: z.record(z.string(), z.any()).describe('Non-searchable data that you want to associate with the user profile. This field supports a nested data structure. Within the `data` object, top-level keys cannot begin with an underscore (`_`) or contain a period (`.`). The data object is not searchable, but can be retrieved with the get user profile API.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityUpdateUserProfileDataRequest' })
export type SecurityUpdateUserProfileDataRequest = z.infer<typeof SecurityUpdateUserProfileDataRequest>

export const SecurityUpdateUserProfileDataResponse = AcknowledgedResponseBase.meta({ id: 'SecurityUpdateUserProfileDataResponse' })
export type SecurityUpdateUserProfileDataResponse = z.infer<typeof SecurityUpdateUserProfileDataResponse>
