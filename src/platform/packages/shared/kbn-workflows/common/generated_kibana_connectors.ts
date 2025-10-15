/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-nocheck
/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * This file contains Kibana connector definitions generated from the Kibana OpenAPI specification.
 * Generated at: 2025-09-29T08:20:45.490Z
 * Source: Kibana OpenAPI spec (483 APIs)
 *
 * To regenerate: npm run generate:kibana-connectors
 */

import { z } from '@kbn/zod';
import type { InternalConnectorContract } from '../spec/lib/generate_yaml_schema';
// Import schemas from generated schemas file
import {
  post_actions_connector_id_Body,
  put_actions_connector_id_Body,
  post_actions_connector_id_execute_Body,
  post_agent_builder_agents_Body,
  put_agent_builder_agents_id_Body,
  post_agent_builder_converse_Body,
  post_agent_builder_tools_Body,
  post_agent_builder_tools_execute_Body,
  put_agent_builder_tools_toolid_Body,
  post_alerting_rule_id_Body,
  put_alerting_rule_id_Body,
  post_alerting_rule_id_snooze_schedule_Body,
  APM_UI_agent_keys_object,
  APM_UI_create_annotation_object,
  APM_UI_agent_configuration_intake_object,
  APM_UI_search_agent_configuration_object,
  APM_UI_upload_source_map_object,
  CreateAssetCriticalityRecord_Body,
  BulkUpsertAssetCriticalityRecords_Body,
  Cases_update_case_request,
  Cases_create_case_request,
  Cases_update_case_comment_request,
  Cases_add_case_comment_request,
  Cases_add_case_file_request,
  Cases_set_case_configuration_request,
  Cases_update_case_configuration_request,
  Data_views_create_data_view_request_object,
  Data_views_update_data_view_request_object,
  createRuntimeFieldDefault_Body,
  setDefaultDatailViewDefault_Body,
  Data_views_swap_data_view_request_object,
  Security_Detections_API_RulePatchProps,
  Security_Detections_API_RuleCreateProps,
  Security_Detections_API_RuleUpdateProps,
  PerformRulesBulkAction_Body,
  CreateRuleExceptionListItems_Body,
  RulePreview_Body,
  SetAlertAssignees_Body,
  SearchAlerts_Body,
  SetAlertsStatus_Body,
  SetAlertTags_Body,
  CreateEndpointListItem_Body,
  UpdateEndpointListItem_Body,
  Security_Endpoint_Management_API_CancelRouteRequestBody,
  Security_Endpoint_Management_API_ExecuteRouteRequestBody,
  Security_Endpoint_Management_API_GetFileRouteRequestBody,
  EndpointIsolateAction_Body,
  Security_Endpoint_Management_API_KillProcessRouteRequestBody,
  Security_Endpoint_Management_API_GetProcessesRouteRequestBody,
  Security_Endpoint_Management_API_RunScriptRouteRequestBody,
  Security_Endpoint_Management_API_ScanRouteRequestBody,
  Security_Endpoint_Management_API_SuspendProcessRouteRequestBody,
  Security_Endpoint_Management_API_UploadRouteRequestBody,
  Security_Entity_Analytics_API_UserName,
  Security_Entity_Analytics_API_MonitoredUserUpdateDoc,
  InitEntityStore_Body,
  InitEntityEngine_Body,
  Security_Entity_Analytics_API_Entity,
  CreateExceptionList_Body,
  UpdateExceptionList_Body,
  CreateExceptionListItem_Body,
  UpdateExceptionListItem_Body,
  CreateSharedExceptionList_Body,
  post_fleet_agent_download_sources_Body,
  post_fleet_agent_policies_Body,
  post_fleet_agent_policies_bulk_get_Body,
  put_fleet_agent_policies_agentpolicyid_Body,
  post_fleet_agent_policies_agentpolicyid_copy_Body,
  post_fleet_agent_policies_delete_Body,
  post_fleet_agent_policies_outputs_Body,
  post_fleet_agents_Body,
  put_fleet_agents_agentid_Body,
  post_fleet_agents_agentid_actions_Body,
  post_fleet_agents_agentid_upgrade_Body,
  post_fleet_agents_bulk_reassign_Body,
  post_fleet_agents_bulk_request_diagnostics_Body,
  post_fleet_agents_bulk_unenroll_Body,
  post_fleet_agents_bulk_update_agent_tags_Body,
  post_fleet_agents_bulk_upgrade_Body,
  post_fleet_cloud_connectors_Body,
  put_fleet_cloud_connectors_cloudconnectorid_Body,
  post_fleet_enrollment_api_keys_Body,
  post_fleet_epm_bulk_assets_Body,
  post_fleet_epm_custom_integrations_Body,
  put_fleet_epm_custom_integrations_pkgname_Body,
  post_fleet_epm_packages_bulk_Body,
  post_fleet_epm_packages_bulk_uninstall_Body,
  post_fleet_epm_packages_bulk_upgrade_Body,
  post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_Body,
  post_fleet_fleet_server_hosts_Body,
  put_fleet_fleet_server_hosts_itemid_Body,
  post_fleet_outputs_Body,
  put_fleet_outputs_outputid_Body,
  post_fleet_package_policies_Body,
  post_fleet_package_policies_bulk_get_Body,
  put_fleet_package_policies_packagepolicyid_Body,
  post_fleet_package_policies_delete_Body,
  post_fleet_package_policies_upgrade_Body,
  post_fleet_package_policies_upgrade_dryrun_Body,
  post_fleet_proxies_Body,
  put_fleet_proxies_itemid_Body,
  put_fleet_settings_Body,
  put_fleet_space_settings_Body,
  PatchList_Body,
  CreateList_Body,
  UpdateList_Body,
  PatchListItem_Body,
  CreateListItem_Body,
  UpdateListItem_Body,
  put_logstash_pipeline_Body,
  post_maintenance_window_Body,
  patch_maintenance_window_id_Body,
  PersistNoteRoute_Body,
  observability_ai_assistant_chat_complete_Body,
  Security_Osquery_API_CreateLiveQueryRequestBody,
  Security_Osquery_API_CreatePacksRequestBody,
  Security_Osquery_API_UpdatePacksRequestBody,
  Security_Osquery_API_CreateSavedQueryRequestBody,
  Security_Osquery_API_UpdateSavedQueryRequestBody,
  PersistPinnedEventRoute_Body,
  ConfigureRiskEngineSavedObject_Body,
  post_saved_objects_export_Body,
  resolveImportErrors_Body,
  PerformAnonymizationFieldsBulkAction_Body,
  Security_AI_Assistant_API_ChatCompleteProps,
  Security_AI_Assistant_API_ConversationCreateProps,
  Security_AI_Assistant_API_ConversationUpdateProps,
  Security_AI_Assistant_API_KnowledgeBaseEntryCreateProps,
  PerformKnowledgeBaseEntryBulkAction_Body,
  Security_AI_Assistant_API_KnowledgeBaseEntryUpdateRouteProps,
  PerformPromptsBulkAction_Body,
  post_security_role_query_Body,
  put_security_role_name_Body,
  post_security_roles_Body,
  post_security_session_invalidate_Body,
  post_url_Body,
  post_spaces_copy_saved_objects_Body,
  post_spaces_disable_legacy_url_aliases_Body,
  post_spaces_get_shareable_references_Body,
  post_spaces_resolve_copy_saved_objects_errors_Body,
  post_spaces_update_objects_spaces_Body,
  post_spaces_space_Body,
  get_streams_Body,
  put_streams_name_Body,
  post_streams_name_fork_Body,
  put_streams_name_group_Body,
  put_streams_name_ingest_Body,
  post_streams_name_content_export_Body,
  post_streams_name_dashboards_bulk_Body,
  post_streams_name_queries_bulk_Body,
  put_streams_name_queries_queryid_Body,
  post_streams_name_significant_events_generate_Body,
  post_streams_name_significant_events_preview_Body,
  post_synthetic_monitors_Body,
  delete_synthetic_monitors_Body,
  post_parameters_Body,
  put_parameter_Body,
  post_private_location_Body,
  PatchTimeline_Body,
  CreateTimelines_Body,
  CleanDraftTimelines_Body,
  ExportTimelines_Body,
  PersistFavoriteRoute_Body,
  ImportTimelines_Body,
  InstallPrepackedTimelines_Body,
  put_uptime_settings_Body,
  SLOs_create_slo_request,
  SLOs_bulk_delete_request,
  SLOs_bulk_purge_rollup_request,
  SLOs_delete_slo_instances_request,
  SLOs_update_slo_request,
} from './generated_kibana_schemas';

export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
  {
    type: 'kibana.get_actions_connector_types',
    connectorIdRequired: false,
    description: 'GET /api/actions/connector_types - Kibana API endpoint',
    summary: 'Get connector types',
    methods: ['GET'],
    patterns: ['/api/actions/connector_types'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_actions_connector_types',
    parameterTypes: {
      pathParams: [],
      urlParams: ['feature_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      feature_id: z.any().optional().describe('Query parameter: feature_id'),
    }),
    outputSchema: z.any().describe('Response from get_actions_connector_types API'),
  },
  {
    type: 'kibana.delete_actions_connector_id',
    connectorIdRequired: false,
    description: 'DELETE /api/actions/connector/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/actions/connector/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_actions_connector_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_actions_connector_id API'),
  },
  {
    type: 'kibana.get_actions_connector_id',
    connectorIdRequired: false,
    description: 'GET /api/actions/connector/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/actions/connector/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_actions_connector_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_actions_connector_id API'),
  },
  {
    type: 'kibana.post_actions_connector_id',
    connectorIdRequired: false,
    description: 'POST /api/actions/connector/:id - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/actions/connector/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_actions_connector_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_actions_connector_id_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_actions_connector_id API'),
  },
  {
    type: 'kibana.put_actions_connector_id',
    connectorIdRequired: false,
    description: 'PUT /api/actions/connector/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/actions/connector/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_actions_connector_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_actions_connector_id_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_actions_connector_id API'),
  },
  {
    type: 'kibana.post_actions_connector_id_execute',
    connectorIdRequired: false,
    description: 'POST /api/actions/connector/:id/_execute - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/actions/connector/{id}/_execute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_actions_connector_id_execute',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_actions_connector_id_execute_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_actions_connector_id_execute API'),
  },
  {
    type: 'kibana.get_actions_connectors',
    connectorIdRequired: false,
    description: 'GET /api/actions/connectors - Kibana API endpoint',
    summary: 'Get all connectors',
    methods: ['GET'],
    patterns: ['/api/actions/connectors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_actions_connectors',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_actions_connectors API'),
  },
  {
    type: 'kibana.post_agent_builder_a2a_agentid',
    connectorIdRequired: false,
    description: 'POST /api/agent_builder/a2a/:agentId - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/agent_builder/a2a/{agentId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_agent_builder_a2a_agentid',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      agentId: z.string().describe('Path parameter: agentId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_agent_builder_a2a_agentid API'),
  },
  {
    type: 'kibana.get_agent_builder_a2a_agentid_json',
    connectorIdRequired: false,
    description: 'GET /api/agent_builder/a2a/:agentId.json - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/agent_builder/a2a/{agentId.json}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_agent_builder_a2a_agentid_json',
    parameterTypes: {
      pathParams: ['agentId', 'agentId.json'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentId: z.string().describe('Path parameter: agentId (required)'),
      'agentId.json': z.string().describe('Path parameter: agentId.json (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_agent_builder_a2a_agentid_json API'),
  },
  {
    type: 'kibana.get_agent_builder_agents',
    connectorIdRequired: false,
    description: 'GET /api/agent_builder/agents - Kibana API endpoint',
    summary: 'List agents',
    methods: ['GET'],
    patterns: ['/api/agent_builder/agents'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_agent_builder_agents',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_agent_builder_agents API'),
  },
  {
    type: 'kibana.post_agent_builder_agents',
    connectorIdRequired: false,
    description: 'POST /api/agent_builder/agents - Kibana API endpoint',
    summary: 'Create an agent',
    methods: ['POST'],
    patterns: ['/api/agent_builder/agents'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_agent_builder_agents',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'avatar_color',
        'avatar_symbol',
        'configuration',
        'instructions',
        'tools',
        'tool_ids',
      ],
    },
    paramsSchema: post_agent_builder_agents_Body,
    outputSchema: z.any().describe('Response from post_agent_builder_agents API'),
  },
  {
    type: 'kibana.delete_agent_builder_agents_id',
    connectorIdRequired: false,
    description: 'DELETE /api/agent_builder/agents/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/agent_builder/agents/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_agent_builder_agents_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_agent_builder_agents_id API'),
  },
  {
    type: 'kibana.get_agent_builder_agents_id',
    connectorIdRequired: false,
    description: 'GET /api/agent_builder/agents/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/agent_builder/agents/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_agent_builder_agents_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_agent_builder_agents_id API'),
  },
  {
    type: 'kibana.put_agent_builder_agents_id',
    connectorIdRequired: false,
    description: 'PUT /api/agent_builder/agents/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/agent_builder/agents/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_agent_builder_agents_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_agent_builder_agents_id_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_agent_builder_agents_id API'),
  },
  {
    type: 'kibana.get_agent_builder_conversations',
    connectorIdRequired: false,
    description: 'GET /api/agent_builder/conversations - Kibana API endpoint',
    summary: 'List conversations',
    methods: ['GET'],
    patterns: ['/api/agent_builder/conversations'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_agent_builder_conversations',
    parameterTypes: {
      pathParams: [],
      urlParams: ['agent_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agent_id: z.any().optional().describe('Query parameter: agent_id'),
    }),
    outputSchema: z.any().describe('Response from get_agent_builder_conversations API'),
  },
  {
    type: 'kibana.delete_agent_builder_conversations_conversation_id',
    connectorIdRequired: false,
    description: 'DELETE /api/agent_builder/conversations/:conversation_id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/agent_builder/conversations/{conversation_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_agent_builder_conversations_conversation_id',
    parameterTypes: {
      pathParams: ['conversation_id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      conversation_id: z.string().describe('Path parameter: conversation_id (required)'),
    }),
    outputSchema: z
      .any()
      .describe('Response from delete_agent_builder_conversations_conversation_id API'),
  },
  {
    type: 'kibana.get_agent_builder_conversations_conversation_id',
    connectorIdRequired: false,
    description: 'GET /api/agent_builder/conversations/:conversation_id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/agent_builder/conversations/{conversation_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_agent_builder_conversations_conversation_id',
    parameterTypes: {
      pathParams: ['conversation_id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      conversation_id: z.string().describe('Path parameter: conversation_id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z
      .any()
      .describe('Response from get_agent_builder_conversations_conversation_id API'),
  },
  {
    type: 'kibana.post_agent_builder_converse',
    connectorIdRequired: false,
    description: 'POST /api/agent_builder/converse - Kibana API endpoint',
    summary: 'Converse with an agent',
    methods: ['POST'],
    patterns: ['/api/agent_builder/converse'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_agent_builder_converse',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_id', 'capabilities', 'visualizations'],
    },
    paramsSchema: post_agent_builder_converse_Body,
    outputSchema: z.any().describe('Response from post_agent_builder_converse API'),
  },
  {
    type: 'kibana.post_agent_builder_converse_async',
    connectorIdRequired: false,
    description: 'POST /api/agent_builder/converse/async - Kibana API endpoint',
    summary: 'Converse with an agent and stream events',
    methods: ['POST'],
    patterns: ['/api/agent_builder/converse/async'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_agent_builder_converse_async',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_id', 'capabilities', 'visualizations'],
    },
    paramsSchema: post_agent_builder_converse_Body,
    outputSchema: z.any().describe('Response from post_agent_builder_converse_async API'),
  },
  {
    type: 'kibana.delete_agent_builder_mcp',
    connectorIdRequired: false,
    description: 'DELETE /api/agent_builder/mcp - Kibana API endpoint',
    summary: 'MCP server',
    methods: ['DELETE'],
    patterns: ['/api/agent_builder/mcp'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_agent_builder_mcp',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({}),
    outputSchema: z.any().describe('Response from delete_agent_builder_mcp API'),
  },
  {
    type: 'kibana.get_agent_builder_mcp',
    connectorIdRequired: false,
    description: 'GET /api/agent_builder/mcp - Kibana API endpoint',
    summary: 'MCP server',
    methods: ['GET'],
    patterns: ['/api/agent_builder/mcp'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_agent_builder_mcp',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_agent_builder_mcp API'),
  },
  {
    type: 'kibana.post_agent_builder_mcp',
    connectorIdRequired: false,
    description: 'POST /api/agent_builder/mcp - Kibana API endpoint',
    summary: 'MCP server',
    methods: ['POST'],
    patterns: ['/api/agent_builder/mcp'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_agent_builder_mcp',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_agent_builder_mcp API'),
  },
  {
    type: 'kibana.get_agent_builder_tools',
    connectorIdRequired: false,
    description: 'GET /api/agent_builder/tools - Kibana API endpoint',
    summary: 'List tools',
    methods: ['GET'],
    patterns: ['/api/agent_builder/tools'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_agent_builder_tools',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_agent_builder_tools API'),
  },
  {
    type: 'kibana.post_agent_builder_tools',
    connectorIdRequired: false,
    description: 'POST /api/agent_builder/tools - Kibana API endpoint',
    summary: 'Create a tool',
    methods: ['POST'],
    patterns: ['/api/agent_builder/tools'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_agent_builder_tools',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['configuration'],
    },
    paramsSchema: post_agent_builder_tools_Body,
    outputSchema: z.any().describe('Response from post_agent_builder_tools API'),
  },
  {
    type: 'kibana.post_agent_builder_tools_execute',
    connectorIdRequired: false,
    description: 'POST /api/agent_builder/tools/_execute - Kibana API endpoint',
    summary: 'Execute a Tool',
    methods: ['POST'],
    patterns: ['/api/agent_builder/tools/_execute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_agent_builder_tools_execute',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['connector_id', 'tool_id', 'tool_params'],
    },
    paramsSchema: post_agent_builder_tools_execute_Body,
    outputSchema: z.any().describe('Response from post_agent_builder_tools_execute API'),
  },
  {
    type: 'kibana.delete_agent_builder_tools_id',
    connectorIdRequired: false,
    description: 'DELETE /api/agent_builder/tools/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/agent_builder/tools/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_agent_builder_tools_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_agent_builder_tools_id API'),
  },
  {
    type: 'kibana.get_agent_builder_tools_id',
    connectorIdRequired: false,
    description: 'GET /api/agent_builder/tools/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/agent_builder/tools/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_agent_builder_tools_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_agent_builder_tools_id API'),
  },
  {
    type: 'kibana.put_agent_builder_tools_toolid',
    connectorIdRequired: false,
    description: 'PUT /api/agent_builder/tools/:toolId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/agent_builder/tools/{toolId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_agent_builder_tools_toolid',
    parameterTypes: {
      pathParams: ['toolId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_agent_builder_tools_toolid_Body;
      const additionalFields = z.object({
        toolId: z.string().describe('Path parameter: toolId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_agent_builder_tools_toolid API'),
  },
  {
    type: 'kibana.getAlertingHealth',
    connectorIdRequired: false,
    description: 'GET /api/alerting/_health - Kibana API endpoint',
    summary: 'Get the alerting framework health',
    methods: ['GET'],
    patterns: ['/api/alerting/_health'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getalertinghealth',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getAlertingHealth API'),
  },
  {
    type: 'kibana.getRuleTypes',
    connectorIdRequired: false,
    description: 'GET /api/alerting/rule_types - Kibana API endpoint',
    summary: 'Get the rule types',
    methods: ['GET'],
    patterns: ['/api/alerting/rule_types'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getruletypes',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getRuleTypes API'),
  },
  {
    type: 'kibana.delete_alerting_rule_id',
    connectorIdRequired: false,
    description: 'DELETE /api/alerting/rule/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/alerting/rule/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_alerting_rule_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_alerting_rule_id API'),
  },
  {
    type: 'kibana.get_alerting_rule_id',
    connectorIdRequired: false,
    description: 'GET /api/alerting/rule/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/alerting/rule/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_alerting_rule_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_alerting_rule_id API'),
  },
  {
    type: 'kibana.post_alerting_rule_id',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:id - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_alerting_rule_id_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_alerting_rule_id API'),
  },
  {
    type: 'kibana.put_alerting_rule_id',
    connectorIdRequired: false,
    description: 'PUT /api/alerting/rule/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/alerting/rule/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_alerting_rule_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_alerting_rule_id_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_alerting_rule_id API'),
  },
  {
    type: 'kibana.post_alerting_rule_id_disable',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:id/_disable - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{id}/_disable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_id_disable',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_alerting_rule_id_disable API'),
  },
  {
    type: 'kibana.post_alerting_rule_id_enable',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:id/_enable - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{id}/_enable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_id_enable',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_alerting_rule_id_enable API'),
  },
  {
    type: 'kibana.post_alerting_rule_id_mute_all',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:id/_mute_all - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{id}/_mute_all'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_id_mute_all',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_alerting_rule_id_mute_all API'),
  },
  {
    type: 'kibana.post_alerting_rule_id_unmute_all',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:id/_unmute_all - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{id}/_unmute_all'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_id_unmute_all',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_alerting_rule_id_unmute_all API'),
  },
  {
    type: 'kibana.post_alerting_rule_id_update_api_key',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:id/_update_api_key - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{id}/_update_api_key'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_id_update_api_key',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_alerting_rule_id_update_api_key API'),
  },
  {
    type: 'kibana.post_alerting_rule_id_snooze_schedule',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:id/snooze_schedule - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{id}/snooze_schedule'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_id_snooze_schedule',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_alerting_rule_id_snooze_schedule_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_alerting_rule_id_snooze_schedule API'),
  },
  {
    type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_mute',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:rule_id/alert/:alert_id/_mute - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_rule_id_alert_alert_id_mute',
    parameterTypes: {
      pathParams: ['rule_id', 'alert_id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      rule_id: z.string().describe('Path parameter: rule_id (required)'),
      alert_id: z.string().describe('Path parameter: alert_id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z
      .any()
      .describe('Response from post_alerting_rule_rule_id_alert_alert_id_mute API'),
  },
  {
    type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_unmute',
    connectorIdRequired: false,
    description: 'POST /api/alerting/rule/:rule_id/alert/:alert_id/_unmute - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_alerting_rule_rule_id_alert_alert_id_unmute',
    parameterTypes: {
      pathParams: ['rule_id', 'alert_id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      rule_id: z.string().describe('Path parameter: rule_id (required)'),
      alert_id: z.string().describe('Path parameter: alert_id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z
      .any()
      .describe('Response from post_alerting_rule_rule_id_alert_alert_id_unmute API'),
  },
  {
    type: 'kibana.delete_alerting_rule_ruleid_snooze_schedule_scheduleid',
    connectorIdRequired: false,
    description:
      'DELETE /api/alerting/rule/:ruleId/snooze_schedule/:scheduleId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_alerting_rule_ruleid_snooze_schedule_scheduleid',
    parameterTypes: {
      pathParams: ['ruleId', 'scheduleId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      ruleId: z.string().describe('Path parameter: ruleId (required)'),
      scheduleId: z.string().describe('Path parameter: scheduleId (required)'),
    }),
    outputSchema: z
      .any()
      .describe('Response from delete_alerting_rule_ruleid_snooze_schedule_scheduleid API'),
  },
  {
    type: 'kibana.get_alerting_rules_find',
    connectorIdRequired: false,
    description: 'GET /api/alerting/rules/_find - Kibana API endpoint',
    summary: 'Get information about rules',
    methods: ['GET'],
    patterns: ['/api/alerting/rules/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_alerting_rules_find',
    parameterTypes: {
      pathParams: [],
      urlParams: ['per_page', 'page', 'search'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      per_page: z.any().optional().describe('Query parameter: per_page'),
      page: z.any().optional().describe('Query parameter: page'),
      search: z.any().optional().describe('Query parameter: search'),
    }),
    outputSchema: z.any().describe('Response from get_alerting_rules_find API'),
  },
  {
    type: 'kibana.createAgentKey',
    connectorIdRequired: false,
    description: 'POST /api/apm/agent_keys - Kibana API endpoint',
    summary: 'Create an APM agent key',
    methods: ['POST'],
    patterns: ['/api/apm/agent_keys'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createagentkey',
    parameterTypes: {
      pathParams: [],
      urlParams: ['elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = APM_UI_agent_keys_object;
      const additionalFields = z.object({
        'elastic-api-version': z
          .string()
          .optional()
          .describe('Header parameter: elastic-api-version'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from createAgentKey API'),
  },
  {
    type: 'kibana.saveApmServerSchema',
    connectorIdRequired: false,
    description: 'POST /api/apm/fleet/apm_server_schema - Kibana API endpoint',
    summary: 'Save APM server schema',
    methods: ['POST'],
    patterns: ['/api/apm/fleet/apm_server_schema'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-saveapmserverschema',
    parameterTypes: {
      pathParams: [],
      urlParams: ['elastic-api-version'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from saveApmServerSchema API'),
  },
  {
    type: 'kibana.createAnnotation',
    connectorIdRequired: false,
    description: 'POST /api/apm/services/:serviceName/annotation - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/apm/services/{serviceName}/annotation'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createannotation',
    parameterTypes: {
      pathParams: ['serviceName'],
      urlParams: ['elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = APM_UI_create_annotation_object;
      const additionalFields = z.object({
        serviceName: z.string().describe('Path parameter: serviceName (required)'),
        'elastic-api-version': z
          .string()
          .optional()
          .describe('Header parameter: elastic-api-version'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from createAnnotation API'),
  },
  {
    type: 'kibana.getAnnotation',
    connectorIdRequired: false,
    description: 'GET /api/apm/services/:serviceName/annotation/search - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/apm/services/{serviceName}/annotation/search'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getannotation',
    parameterTypes: {
      pathParams: ['serviceName'],
      urlParams: ['environment', 'start', 'end', 'elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      serviceName: z.string().describe('Path parameter: serviceName (required)'),
      environment: z.any().optional().describe('Query parameter: environment'),
      start: z.any().optional().describe('Query parameter: start'),
      end: z.any().optional().describe('Query parameter: end'),
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
    }),
    outputSchema: z.any().describe('Response from getAnnotation API'),
  },
  {
    type: 'kibana.deleteAgentConfiguration',
    connectorIdRequired: false,
    description: 'DELETE /api/apm/settings/agent-configuration - Kibana API endpoint',
    summary: 'Delete agent configuration',
    methods: ['DELETE'],
    patterns: ['/api/apm/settings/agent-configuration'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteagentconfiguration',
    parameterTypes: {
      pathParams: [],
      urlParams: ['elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
    }),
    outputSchema: z.any().describe('Response from deleteAgentConfiguration API'),
  },
  {
    type: 'kibana.getAgentConfigurations',
    connectorIdRequired: false,
    description: 'GET /api/apm/settings/agent-configuration - Kibana API endpoint',
    summary: 'Get a list of agent configurations',
    methods: ['GET'],
    patterns: ['/api/apm/settings/agent-configuration'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getagentconfigurations',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query', 'elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getAgentConfigurations API'),
  },
  {
    type: 'kibana.createUpdateAgentConfiguration',
    connectorIdRequired: false,
    description: 'PUT /api/apm/settings/agent-configuration - Kibana API endpoint',
    summary: 'Create or update agent configuration',
    methods: ['PUT'],
    patterns: ['/api/apm/settings/agent-configuration'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createupdateagentconfiguration',
    parameterTypes: {
      pathParams: [],
      urlParams: ['overwrite', 'elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = APM_UI_agent_configuration_intake_object;
      const additionalFields = z.object({
        overwrite: z.any().optional().describe('Query parameter: overwrite'),
        'elastic-api-version': z
          .string()
          .optional()
          .describe('Header parameter: elastic-api-version'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from createUpdateAgentConfiguration API'),
  },
  {
    type: 'kibana.getAgentNameForService',
    connectorIdRequired: false,
    description: 'GET /api/apm/settings/agent-configuration/agent_name - Kibana API endpoint',
    summary: 'Get agent name for service',
    methods: ['GET'],
    patterns: ['/api/apm/settings/agent-configuration/agent_name'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getagentnameforservice',
    parameterTypes: {
      pathParams: [],
      urlParams: ['serviceName', 'elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      serviceName: z.any().optional().describe('Query parameter: serviceName'),
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
    }),
    outputSchema: z.any().describe('Response from getAgentNameForService API'),
  },
  {
    type: 'kibana.getEnvironmentsForService',
    connectorIdRequired: false,
    description: 'GET /api/apm/settings/agent-configuration/environments - Kibana API endpoint',
    summary: 'Get environments for service',
    methods: ['GET'],
    patterns: ['/api/apm/settings/agent-configuration/environments'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getenvironmentsforservice',
    parameterTypes: {
      pathParams: [],
      urlParams: ['serviceName', 'elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      serviceName: z.any().optional().describe('Query parameter: serviceName'),
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
    }),
    outputSchema: z.any().describe('Response from getEnvironmentsForService API'),
  },
  {
    type: 'kibana.searchSingleConfiguration',
    connectorIdRequired: false,
    description: 'POST /api/apm/settings/agent-configuration/search - Kibana API endpoint',
    summary: 'Lookup single agent configuration',
    methods: ['POST'],
    patterns: ['/api/apm/settings/agent-configuration/search'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-searchsingleconfiguration',
    parameterTypes: {
      pathParams: [],
      urlParams: ['elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = APM_UI_search_agent_configuration_object;
      const additionalFields = z.object({
        'elastic-api-version': z
          .string()
          .optional()
          .describe('Header parameter: elastic-api-version'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from searchSingleConfiguration API'),
  },
  {
    type: 'kibana.getSingleAgentConfiguration',
    connectorIdRequired: false,
    description: 'GET /api/apm/settings/agent-configuration/view - Kibana API endpoint',
    summary: 'Get single agent configuration',
    methods: ['GET'],
    patterns: ['/api/apm/settings/agent-configuration/view'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getsingleagentconfiguration',
    parameterTypes: {
      pathParams: [],
      urlParams: ['name', 'environment', 'elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.any().optional().describe('Query parameter: name'),
      environment: z.any().optional().describe('Query parameter: environment'),
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
    }),
    outputSchema: z.any().describe('Response from getSingleAgentConfiguration API'),
  },
  {
    type: 'kibana.getSourceMaps',
    connectorIdRequired: false,
    description: 'GET /api/apm/sourcemaps - Kibana API endpoint',
    summary: 'Get source maps',
    methods: ['GET'],
    patterns: ['/api/apm/sourcemaps'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getsourcemaps',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'perPage', 'elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
    }),
    outputSchema: z.any().describe('Response from getSourceMaps API'),
  },
  {
    type: 'kibana.uploadSourceMap',
    connectorIdRequired: false,
    description: 'POST /api/apm/sourcemaps - Kibana API endpoint',
    summary: 'Upload a source map',
    methods: ['POST'],
    patterns: ['/api/apm/sourcemaps'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-uploadsourcemap',
    parameterTypes: {
      pathParams: [],
      urlParams: ['elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = APM_UI_upload_source_map_object;
      const additionalFields = z.object({
        'elastic-api-version': z
          .string()
          .optional()
          .describe('Header parameter: elastic-api-version'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from uploadSourceMap API'),
  },
  {
    type: 'kibana.deleteSourceMap',
    connectorIdRequired: false,
    description: 'DELETE /api/apm/sourcemaps/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/apm/sourcemaps/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletesourcemap',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['elastic-api-version'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      'elastic-api-version': z
        .string()
        .optional()
        .describe('Header parameter: elastic-api-version'),
    }),
    outputSchema: z.any().describe('Response from deleteSourceMap API'),
  },
  {
    type: 'kibana.DeleteAssetCriticalityRecord',
    connectorIdRequired: false,
    description: 'DELETE /api/asset_criticality - Kibana API endpoint',
    summary: 'Delete an asset criticality record',
    methods: ['DELETE'],
    patterns: ['/api/asset_criticality'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteassetcriticalityrecord',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id_value'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id_value: z.any().optional().describe('Query parameter: id_value'),
    }),
    outputSchema: z.any().describe('Response from DeleteAssetCriticalityRecord API'),
  },
  {
    type: 'kibana.GetAssetCriticalityRecord',
    connectorIdRequired: false,
    description: 'GET /api/asset_criticality - Kibana API endpoint',
    summary: 'Get an asset criticality record',
    methods: ['GET'],
    patterns: ['/api/asset_criticality'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getassetcriticalityrecord',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id_value'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id_value: z.any().optional().describe('Query parameter: id_value'),
    }),
    outputSchema: z.any().describe('Response from GetAssetCriticalityRecord API'),
  },
  {
    type: 'kibana.CreateAssetCriticalityRecord',
    connectorIdRequired: false,
    description: 'POST /api/asset_criticality - Kibana API endpoint',
    summary: 'Upsert an asset criticality record',
    methods: ['POST'],
    patterns: ['/api/asset_criticality'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createassetcriticalityrecord',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: CreateAssetCriticalityRecord_Body,
    outputSchema: z.any().describe('Response from CreateAssetCriticalityRecord API'),
  },
  {
    type: 'kibana.BulkUpsertAssetCriticalityRecords',
    connectorIdRequired: false,
    description: 'POST /api/asset_criticality/bulk - Kibana API endpoint',
    summary: 'Bulk upsert asset criticality records',
    methods: ['POST'],
    patterns: ['/api/asset_criticality/bulk'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkupsertassetcriticalityrecords',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['records', 'criticality_level'],
    },
    paramsSchema: BulkUpsertAssetCriticalityRecords_Body,
    outputSchema: z.any().describe('Response from BulkUpsertAssetCriticalityRecords API'),
  },
  {
    type: 'kibana.FindAssetCriticalityRecords',
    connectorIdRequired: false,
    description: 'GET /api/asset_criticality/list - Kibana API endpoint',
    summary: 'List asset criticality records',
    methods: ['GET'],
    patterns: ['/api/asset_criticality/list'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findassetcriticalityrecords',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from FindAssetCriticalityRecords API'),
  },
  {
    type: 'kibana.deleteCaseDefaultSpace',
    connectorIdRequired: false,
    description: 'DELETE /api/cases - Kibana API endpoint',
    summary: 'Delete cases',
    methods: ['DELETE'],
    patterns: ['/api/cases'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletecasedefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: ['ids'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      ids: z.any().optional().describe('Query parameter: ids'),
    }),
    outputSchema: z.any().describe('Response from deleteCaseDefaultSpace API'),
  },
  {
    type: 'kibana.updateCaseDefaultSpace',
    connectorIdRequired: false,
    description: 'PATCH /api/cases - Kibana API endpoint',
    summary: 'Update cases',
    methods: ['PATCH'],
    patterns: ['/api/cases'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatecasedefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'cases',
        'assignees',
        'category',
        'connector',
        'customFields',
        'key',
        'type',
        'value',
      ],
    },
    paramsSchema: Cases_update_case_request,
    outputSchema: z.any().describe('Response from updateCaseDefaultSpace API'),
  },
  {
    type: 'kibana.createCaseDefaultSpace',
    connectorIdRequired: false,
    description: 'POST /api/cases - Kibana API endpoint',
    summary: 'Create a case',
    methods: ['POST'],
    patterns: ['/api/cases'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createcasedefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['assignees', 'category', 'connector', 'customFields', 'key', 'type', 'value'],
    },
    paramsSchema: Cases_create_case_request,
    outputSchema: z.any().describe('Response from createCaseDefaultSpace API'),
  },
  {
    type: 'kibana.findCasesDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/_find - Kibana API endpoint',
    summary: 'Search cases',
    methods: ['GET'],
    patterns: ['/api/cases/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findcasesdefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'assignees',
        'category',
        'defaultSearchOperator',
        'from',
        'owner',
        'page',
        'perPage',
        'reporters',
        'search',
        'searchFields',
      ],
      bodyParams: [],
    },
    paramsSchema: z.object({
      assignees: z.any().optional().describe('Query parameter: assignees'),
      category: z.any().optional().describe('Query parameter: category'),
      defaultSearchOperator: z.any().optional().describe('Query parameter: defaultSearchOperator'),
      from: z.any().optional().describe('Query parameter: from'),
      owner: z.any().optional().describe('Query parameter: owner'),
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      reporters: z.any().optional().describe('Query parameter: reporters'),
      search: z.any().optional().describe('Query parameter: search'),
      searchFields: z.any().optional().describe('Query parameter: searchFields'),
    }),
    outputSchema: z.any().describe('Response from findCasesDefaultSpace API'),
  },
  {
    type: 'kibana.getCaseDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/:caseId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/cases/{caseId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getcasedefaultspace',
    parameterTypes: {
      pathParams: ['caseId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      caseId: z.string().describe('Path parameter: caseId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getCaseDefaultSpace API'),
  },
  {
    type: 'kibana.getCaseAlertsDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/:caseId/alerts - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/cases/{caseId}/alerts'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getcasealertsdefaultspace',
    parameterTypes: {
      pathParams: ['caseId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      caseId: z.string().describe('Path parameter: caseId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getCaseAlertsDefaultSpace API'),
  },
  {
    type: 'kibana.deleteCaseCommentsDefaultSpace',
    connectorIdRequired: false,
    description: 'DELETE /api/cases/:caseId/comments - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/cases/{caseId}/comments'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletecasecommentsdefaultspace',
    parameterTypes: {
      pathParams: ['caseId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      caseId: z.string().describe('Path parameter: caseId (required)'),
    }),
    outputSchema: z.any().describe('Response from deleteCaseCommentsDefaultSpace API'),
  },
  {
    type: 'kibana.updateCaseCommentDefaultSpace',
    connectorIdRequired: false,
    description: 'PATCH /api/cases/:caseId/comments - Kibana API endpoint',
    methods: ['PATCH'],
    patterns: ['/api/cases/{caseId}/comments'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatecasecommentdefaultspace',
    parameterTypes: {
      pathParams: ['caseId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Cases_update_case_comment_request;
      const additionalFields = z.object({
        caseId: z.string().describe('Path parameter: caseId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from updateCaseCommentDefaultSpace API'),
  },
  {
    type: 'kibana.addCaseCommentDefaultSpace',
    connectorIdRequired: false,
    description: 'POST /api/cases/:caseId/comments - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/cases/{caseId}/comments'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-addcasecommentdefaultspace',
    parameterTypes: {
      pathParams: ['caseId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Cases_add_case_comment_request;
      const additionalFields = z.object({
        caseId: z.string().describe('Path parameter: caseId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from addCaseCommentDefaultSpace API'),
  },
  {
    type: 'kibana.findCaseCommentsDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/:caseId/comments/_find - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/cases/{caseId}/comments/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findcasecommentsdefaultspace',
    parameterTypes: {
      pathParams: ['caseId'],
      urlParams: ['page', 'perPage'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      caseId: z.string().describe('Path parameter: caseId (required)'),
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
    }),
    outputSchema: z.any().describe('Response from findCaseCommentsDefaultSpace API'),
  },
  {
    type: 'kibana.deleteCaseCommentDefaultSpace',
    connectorIdRequired: false,
    description: 'DELETE /api/cases/:caseId/comments/:commentId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/cases/{caseId}/comments/{commentId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletecasecommentdefaultspace',
    parameterTypes: {
      pathParams: ['caseId', 'commentId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      caseId: z.string().describe('Path parameter: caseId (required)'),
      commentId: z.string().describe('Path parameter: commentId (required)'),
    }),
    outputSchema: z.any().describe('Response from deleteCaseCommentDefaultSpace API'),
  },
  {
    type: 'kibana.getCaseCommentDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/:caseId/comments/:commentId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/cases/{caseId}/comments/{commentId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getcasecommentdefaultspace',
    parameterTypes: {
      pathParams: ['caseId', 'commentId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      caseId: z.string().describe('Path parameter: caseId (required)'),
      commentId: z.string().describe('Path parameter: commentId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getCaseCommentDefaultSpace API'),
  },
  {
    type: 'kibana.pushCaseDefaultSpace',
    connectorIdRequired: false,
    description: 'POST /api/cases/:caseId/connector/:connectorId/_push - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/cases/{caseId}/connector/{connectorId}/_push'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-pushcasedefaultspace',
    parameterTypes: {
      pathParams: ['caseId', 'connectorId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      caseId: z.string().describe('Path parameter: caseId (required)'),
      connectorId: z.string().describe('Path parameter: connectorId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from pushCaseDefaultSpace API'),
  },
  {
    type: 'kibana.addCaseFileDefaultSpace',
    connectorIdRequired: false,
    description: 'POST /api/cases/:caseId/files - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/cases/{caseId}/files'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-addcasefiledefaultspace',
    parameterTypes: {
      pathParams: ['caseId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Cases_add_case_file_request;
      const additionalFields = z.object({
        caseId: z.string().describe('Path parameter: caseId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from addCaseFileDefaultSpace API'),
  },
  {
    type: 'kibana.findCaseActivityDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/:caseId/user_actions/_find - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/cases/{caseId}/user_actions/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findcaseactivitydefaultspace',
    parameterTypes: {
      pathParams: ['caseId'],
      urlParams: ['page', 'perPage'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      caseId: z.string().describe('Path parameter: caseId (required)'),
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
    }),
    outputSchema: z.any().describe('Response from findCaseActivityDefaultSpace API'),
  },
  {
    type: 'kibana.getCasesByAlertDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/alerts/:alertId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/cases/alerts/{alertId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getcasesbyalertdefaultspace',
    parameterTypes: {
      pathParams: ['alertId'],
      urlParams: ['owner'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      alertId: z.string().describe('Path parameter: alertId (required)'),
      owner: z.any().optional().describe('Query parameter: owner'),
    }),
    outputSchema: z.any().describe('Response from getCasesByAlertDefaultSpace API'),
  },
  {
    type: 'kibana.getCaseConfigurationDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/configure - Kibana API endpoint',
    summary: 'Get case settings',
    methods: ['GET'],
    patterns: ['/api/cases/configure'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getcaseconfigurationdefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: ['owner'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      owner: z.any().optional().describe('Query parameter: owner'),
    }),
    outputSchema: z.any().describe('Response from getCaseConfigurationDefaultSpace API'),
  },
  {
    type: 'kibana.setCaseConfigurationDefaultSpace',
    connectorIdRequired: false,
    description: 'POST /api/cases/configure - Kibana API endpoint',
    summary: 'Add case settings',
    methods: ['POST'],
    patterns: ['/api/cases/configure'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-setcaseconfigurationdefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['closure_type', 'connector', 'fields'],
    },
    paramsSchema: Cases_set_case_configuration_request,
    outputSchema: z.any().describe('Response from setCaseConfigurationDefaultSpace API'),
  },
  {
    type: 'kibana.updateCaseConfigurationDefaultSpace',
    connectorIdRequired: false,
    description: 'PATCH /api/cases/configure/:configurationId - Kibana API endpoint',
    methods: ['PATCH'],
    patterns: ['/api/cases/configure/{configurationId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatecaseconfigurationdefaultspace',
    parameterTypes: {
      pathParams: ['configurationId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Cases_update_case_configuration_request;
      const additionalFields = z.object({
        configurationId: z.string().describe('Path parameter: configurationId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from updateCaseConfigurationDefaultSpace API'),
  },
  {
    type: 'kibana.findCaseConnectorsDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/configure/connectors/_find - Kibana API endpoint',
    summary: 'Get case connectors',
    methods: ['GET'],
    patterns: ['/api/cases/configure/connectors/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findcaseconnectorsdefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from findCaseConnectorsDefaultSpace API'),
  },
  {
    type: 'kibana.getCaseReportersDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/reporters - Kibana API endpoint',
    summary: 'Get case creators',
    methods: ['GET'],
    patterns: ['/api/cases/reporters'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getcasereportersdefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: ['owner'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      owner: z.any().optional().describe('Query parameter: owner'),
    }),
    outputSchema: z.any().describe('Response from getCaseReportersDefaultSpace API'),
  },
  {
    type: 'kibana.getCaseTagsDefaultSpace',
    connectorIdRequired: false,
    description: 'GET /api/cases/tags - Kibana API endpoint',
    summary: 'Get case tags',
    methods: ['GET'],
    patterns: ['/api/cases/tags'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getcasetagsdefaultspace',
    parameterTypes: {
      pathParams: [],
      urlParams: ['owner'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      owner: z.any().optional().describe('Query parameter: owner'),
    }),
    outputSchema: z.any().describe('Response from getCaseTagsDefaultSpace API'),
  },
  {
    type: 'kibana.getAllDataViewsDefault',
    connectorIdRequired: false,
    description: 'GET /api/data_views - Kibana API endpoint',
    summary: 'Get all data views',
    methods: ['GET'],
    patterns: ['/api/data_views'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getalldataviewsdefault',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getAllDataViewsDefault API'),
  },
  {
    type: 'kibana.createDataViewDefaultw',
    connectorIdRequired: false,
    description: 'POST /api/data_views/data_view - Kibana API endpoint',
    summary: 'Create a data view',
    methods: ['POST'],
    patterns: ['/api/data_views/data_view'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createdataviewdefaultw',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['data_view', 'allowNoIndex', 'fieldAttrs', 'fieldFormats', 'fields'],
    },
    paramsSchema: Data_views_create_data_view_request_object,
    outputSchema: z.any().describe('Response from createDataViewDefaultw API'),
  },
  {
    type: 'kibana.deleteDataViewDefault',
    connectorIdRequired: false,
    description: 'DELETE /api/data_views/data_view/:viewId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/data_views/data_view/{viewId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletedataviewdefault',
    parameterTypes: {
      pathParams: ['viewId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      viewId: z.string().describe('Path parameter: viewId (required)'),
    }),
    outputSchema: z.any().describe('Response from deleteDataViewDefault API'),
  },
  {
    type: 'kibana.getDataViewDefault',
    connectorIdRequired: false,
    description: 'GET /api/data_views/data_view/:viewId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/data_views/data_view/{viewId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getdataviewdefault',
    parameterTypes: {
      pathParams: ['viewId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      viewId: z.string().describe('Path parameter: viewId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getDataViewDefault API'),
  },
  {
    type: 'kibana.updateDataViewDefault',
    connectorIdRequired: false,
    description: 'POST /api/data_views/data_view/:viewId - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/data_views/data_view/{viewId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatedataviewdefault',
    parameterTypes: {
      pathParams: ['viewId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Data_views_update_data_view_request_object;
      const additionalFields = z.object({
        viewId: z.string().describe('Path parameter: viewId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from updateDataViewDefault API'),
  },
  {
    type: 'kibana.updateFieldsMetadataDefault',
    connectorIdRequired: false,
    description: 'POST /api/data_views/data_view/:viewId/fields - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/data_views/data_view/{viewId}/fields'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatefieldsmetadatadefault',
    parameterTypes: {
      pathParams: ['viewId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      viewId: z.string().describe('Path parameter: viewId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from updateFieldsMetadataDefault API'),
  },
  {
    type: 'kibana.createRuntimeFieldDefault',
    connectorIdRequired: false,
    description: 'POST /api/data_views/data_view/:viewId/runtime_field - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/data_views/data_view/{viewId}/runtime_field'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createruntimefielddefault',
    parameterTypes: {
      pathParams: ['viewId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = createRuntimeFieldDefault_Body;
      const additionalFields = z.object({
        viewId: z.string().describe('Path parameter: viewId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from createRuntimeFieldDefault API'),
  },
  {
    type: 'kibana.createUpdateRuntimeFieldDefault',
    connectorIdRequired: false,
    description: 'PUT /api/data_views/data_view/:viewId/runtime_field - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/data_views/data_view/{viewId}/runtime_field'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createupdateruntimefielddefault',
    parameterTypes: {
      pathParams: ['viewId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = createRuntimeFieldDefault_Body;
      const additionalFields = z.object({
        viewId: z.string().describe('Path parameter: viewId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from createUpdateRuntimeFieldDefault API'),
  },
  {
    type: 'kibana.deleteRuntimeFieldDefault',
    connectorIdRequired: false,
    description:
      'DELETE /api/data_views/data_view/:viewId/runtime_field/:fieldName - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteruntimefielddefault',
    parameterTypes: {
      pathParams: ['fieldName', 'viewId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fieldName: z.string().describe('Path parameter: fieldName (required)'),
      viewId: z.string().describe('Path parameter: viewId (required)'),
    }),
    outputSchema: z.any().describe('Response from deleteRuntimeFieldDefault API'),
  },
  {
    type: 'kibana.getRuntimeFieldDefault',
    connectorIdRequired: false,
    description:
      'GET /api/data_views/data_view/:viewId/runtime_field/:fieldName - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getruntimefielddefault',
    parameterTypes: {
      pathParams: ['fieldName', 'viewId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fieldName: z.string().describe('Path parameter: fieldName (required)'),
      viewId: z.string().describe('Path parameter: viewId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getRuntimeFieldDefault API'),
  },
  {
    type: 'kibana.updateRuntimeFieldDefault',
    connectorIdRequired: false,
    description:
      'POST /api/data_views/data_view/:viewId/runtime_field/:fieldName - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/data_views/data_view/{viewId}/runtime_field/{fieldName}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateruntimefielddefault',
    parameterTypes: {
      pathParams: ['fieldName', 'viewId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      fieldName: z.string().describe('Path parameter: fieldName (required)'),
      viewId: z.string().describe('Path parameter: viewId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from updateRuntimeFieldDefault API'),
  },
  {
    type: 'kibana.getDefaultDataViewDefault',
    connectorIdRequired: false,
    description: 'GET /api/data_views/default - Kibana API endpoint',
    summary: 'Get the default data view',
    methods: ['GET'],
    patterns: ['/api/data_views/default'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getdefaultdataviewdefault',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from getDefaultDataViewDefault API'),
  },
  {
    type: 'kibana.setDefaultDatailViewDefault',
    connectorIdRequired: false,
    description: 'POST /api/data_views/default - Kibana API endpoint',
    summary: 'Set the default data view',
    methods: ['POST'],
    patterns: ['/api/data_views/default'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-setdefaultdatailviewdefault',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['data_view_id', 'force'],
    },
    paramsSchema: setDefaultDatailViewDefault_Body,
    outputSchema: z.any().describe('Response from setDefaultDatailViewDefault API'),
  },
  {
    type: 'kibana.swapDataViewsDefault',
    connectorIdRequired: false,
    description: 'POST /api/data_views/swap_references - Kibana API endpoint',
    summary: 'Swap saved object references',
    methods: ['POST'],
    patterns: ['/api/data_views/swap_references'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-swapdataviewsdefault',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['delete', 'forId', 'forType', 'fromId', 'fromType', 'toId'],
    },
    paramsSchema: Data_views_swap_data_view_request_object,
    outputSchema: z.any().describe('Response from swapDataViewsDefault API'),
  },
  {
    type: 'kibana.previewSwapDataViewsDefault',
    connectorIdRequired: false,
    description: 'POST /api/data_views/swap_references/_preview - Kibana API endpoint',
    summary: 'Preview a saved object reference swap',
    methods: ['POST'],
    patterns: ['/api/data_views/swap_references/_preview'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-previewswapdataviewsdefault',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['delete', 'forId', 'forType', 'fromId', 'fromType', 'toId'],
    },
    paramsSchema: Data_views_swap_data_view_request_object,
    outputSchema: z.any().describe('Response from previewSwapDataViewsDefault API'),
  },
  {
    type: 'kibana.DeleteAlertsIndex',
    connectorIdRequired: false,
    description: 'DELETE /api/detection_engine/index - Kibana API endpoint',
    summary: 'Delete an alerts index',
    methods: ['DELETE'],
    patterns: ['/api/detection_engine/index'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletealertsindex',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({}),
    outputSchema: z.any().describe('Response from DeleteAlertsIndex API'),
  },
  {
    type: 'kibana.ReadAlertsIndex',
    connectorIdRequired: false,
    description: 'GET /api/detection_engine/index - Kibana API endpoint',
    summary: 'Reads the alert index name if it exists',
    methods: ['GET'],
    patterns: ['/api/detection_engine/index'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readalertsindex',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadAlertsIndex API'),
  },
  {
    type: 'kibana.CreateAlertsIndex',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/index - Kibana API endpoint',
    summary: 'Create an alerts index',
    methods: ['POST'],
    patterns: ['/api/detection_engine/index'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createalertsindex',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from CreateAlertsIndex API'),
  },
  {
    type: 'kibana.ReadPrivileges',
    connectorIdRequired: false,
    description: 'GET /api/detection_engine/privileges - Kibana API endpoint',
    summary: 'Returns user privileges for the Kibana space',
    methods: ['GET'],
    patterns: ['/api/detection_engine/privileges'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readprivileges',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadPrivileges API'),
  },
  {
    type: 'kibana.DeleteRule',
    connectorIdRequired: false,
    description: 'DELETE /api/detection_engine/rules - Kibana API endpoint',
    summary: 'Delete a detection rule',
    methods: ['DELETE'],
    patterns: ['/api/detection_engine/rules'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleterule',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'rule_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      rule_id: z.any().optional().describe('Query parameter: rule_id'),
    }),
    outputSchema: z.any().describe('Response from DeleteRule API'),
  },
  {
    type: 'kibana.ReadRule',
    connectorIdRequired: false,
    description: 'GET /api/detection_engine/rules - Kibana API endpoint',
    summary: 'Retrieve a detection rule',
    methods: ['GET'],
    patterns: ['/api/detection_engine/rules'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readrule',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'rule_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      rule_id: z.any().optional().describe('Query parameter: rule_id'),
    }),
    outputSchema: z.any().describe('Response from ReadRule API'),
  },
  {
    type: 'kibana.PatchRule',
    connectorIdRequired: false,
    description: 'PATCH /api/detection_engine/rules - Kibana API endpoint',
    summary: 'Patch a detection rule',
    methods: ['PATCH'],
    patterns: ['/api/detection_engine/rules'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-patchrule',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: Security_Detections_API_RulePatchProps,
    outputSchema: z.any().describe('Response from PatchRule API'),
  },
  {
    type: 'kibana.CreateRule',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/rules - Kibana API endpoint',
    summary: 'Create a detection rule',
    methods: ['POST'],
    patterns: ['/api/detection_engine/rules'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createrule',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: Security_Detections_API_RuleCreateProps,
    outputSchema: z.any().describe('Response from CreateRule API'),
  },
  {
    type: 'kibana.UpdateRule',
    connectorIdRequired: false,
    description: 'PUT /api/detection_engine/rules - Kibana API endpoint',
    summary: 'Update a detection rule',
    methods: ['PUT'],
    patterns: ['/api/detection_engine/rules'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updaterule',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: Security_Detections_API_RuleUpdateProps,
    outputSchema: z.any().describe('Response from UpdateRule API'),
  },
  {
    type: 'kibana.PerformRulesBulkAction',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/rules/_bulk_action - Kibana API endpoint',
    summary: 'Apply a bulk action to detection rules',
    methods: ['POST'],
    patterns: ['/api/detection_engine/rules/_bulk_action'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-performrulesbulkaction',
    parameterTypes: {
      pathParams: [],
      urlParams: ['dry_run'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = PerformRulesBulkAction_Body;
      const additionalFields = z.object({
        dry_run: z.any().optional().describe('Query parameter: dry_run'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from PerformRulesBulkAction API'),
  },
  {
    type: 'kibana.ExportRules',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/rules/_export - Kibana API endpoint',
    summary: 'Export detection rules',
    methods: ['POST'],
    patterns: ['/api/detection_engine/rules/_export'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportrules',
    parameterTypes: {
      pathParams: [],
      urlParams: ['exclude_export_details', 'file_name'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      exclude_export_details: z
        .any()
        .optional()
        .describe('Query parameter: exclude_export_details'),
      file_name: z.any().optional().describe('Query parameter: file_name'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ExportRules API'),
  },
  {
    type: 'kibana.FindRules',
    connectorIdRequired: false,
    description: 'GET /api/detection_engine/rules/_find - Kibana API endpoint',
    summary: 'List all detection rules',
    methods: ['GET'],
    patterns: ['/api/detection_engine/rules/_find'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findrules',
    parameterTypes: {
      pathParams: [],
      urlParams: ['fields', 'filter'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fields: z.any().optional().describe('Query parameter: fields'),
      filter: z.any().optional().describe('Query parameter: filter'),
    }),
    outputSchema: z.any().describe('Response from FindRules API'),
  },
  {
    type: 'kibana.ImportRules',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/rules/_import - Kibana API endpoint',
    summary: 'Import detection rules',
    methods: ['POST'],
    patterns: ['/api/detection_engine/rules/_import'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-importrules',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'overwrite',
        'overwrite_exceptions',
        'overwrite_action_connectors',
        'as_new_list',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      overwrite: z.any().optional().describe('Query parameter: overwrite'),
      overwrite_exceptions: z.any().optional().describe('Query parameter: overwrite_exceptions'),
      overwrite_action_connectors: z
        .any()
        .optional()
        .describe('Query parameter: overwrite_action_connectors'),
      as_new_list: z.any().optional().describe('Query parameter: as_new_list'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ImportRules API'),
  },
  {
    type: 'kibana.CreateRuleExceptionListItems',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/rules/:id/exceptions - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/detection_engine/rules/{id}/exceptions'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createruleexceptionlistitems',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = CreateRuleExceptionListItems_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from CreateRuleExceptionListItems API'),
  },
  {
    type: 'kibana.InstallPrebuiltRulesAndTimelines',
    connectorIdRequired: false,
    description: 'PUT /api/detection_engine/rules/prepackaged - Kibana API endpoint',
    summary: 'Install prebuilt detection rules and Timelines',
    methods: ['PUT'],
    patterns: ['/api/detection_engine/rules/prepackaged'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-installprebuiltrulesandtimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from InstallPrebuiltRulesAndTimelines API'),
  },
  {
    type: 'kibana.ReadPrebuiltRulesAndTimelinesStatus',
    connectorIdRequired: false,
    description: 'GET /api/detection_engine/rules/prepackaged/_status - Kibana API endpoint',
    summary: 'Retrieve the status of prebuilt detection rules and Timelines',
    methods: ['GET'],
    patterns: ['/api/detection_engine/rules/prepackaged/_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readprebuiltrulesandtimelinesstatus',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadPrebuiltRulesAndTimelinesStatus API'),
  },
  {
    type: 'kibana.RulePreview',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/rules/preview - Kibana API endpoint',
    summary: 'Preview rule alerts generated on specified time range',
    methods: ['POST'],
    patterns: ['/api/detection_engine/rules/preview'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-rulepreview',
    parameterTypes: {
      pathParams: [],
      urlParams: ['enable_logged_requests'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = RulePreview_Body;
      const additionalFields = z.object({
        enable_logged_requests: z
          .any()
          .optional()
          .describe('Query parameter: enable_logged_requests'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from RulePreview API'),
  },
  {
    type: 'kibana.SetAlertAssignees',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/signals/assignees - Kibana API endpoint',
    summary: 'Assign and unassign users from detection alerts',
    methods: ['POST'],
    patterns: ['/api/detection_engine/signals/assignees'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-setalertassignees',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['assignees', 'ids'],
    },
    paramsSchema: SetAlertAssignees_Body,
    outputSchema: z.any().describe('Response from SetAlertAssignees API'),
  },
  {
    type: 'kibana.SearchAlerts',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/signals/search - Kibana API endpoint',
    summary: 'Find and/or aggregate detection alerts',
    methods: ['POST'],
    patterns: ['/api/detection_engine/signals/search'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-searchalerts',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['_source', 'aggs'],
    },
    paramsSchema: SearchAlerts_Body,
    outputSchema: z.any().describe('Response from SearchAlerts API'),
  },
  {
    type: 'kibana.SetAlertsStatus',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/signals/status - Kibana API endpoint',
    summary: 'Set a detection alert status',
    methods: ['POST'],
    patterns: ['/api/detection_engine/signals/status'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-setalertsstatus',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: SetAlertsStatus_Body,
    outputSchema: z.any().describe('Response from SetAlertsStatus API'),
  },
  {
    type: 'kibana.SetAlertTags',
    connectorIdRequired: false,
    description: 'POST /api/detection_engine/signals/tags - Kibana API endpoint',
    summary: 'Add and remove detection alert tags',
    methods: ['POST'],
    patterns: ['/api/detection_engine/signals/tags'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-setalerttags',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['ids', 'tags'],
    },
    paramsSchema: SetAlertTags_Body,
    outputSchema: z.any().describe('Response from SetAlertTags API'),
  },
  {
    type: 'kibana.ReadTags',
    connectorIdRequired: false,
    description: 'GET /api/detection_engine/tags - Kibana API endpoint',
    summary: 'List all detection rule tags',
    methods: ['GET'],
    patterns: ['/api/detection_engine/tags'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readtags',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadTags API'),
  },
  {
    type: 'kibana.rotateEncryptionKey',
    connectorIdRequired: false,
    description: 'POST /api/encrypted_saved_objects/_rotate_key - Kibana API endpoint',
    summary: 'Rotate a key for encrypted saved objects',
    methods: ['POST'],
    patterns: ['/api/encrypted_saved_objects/_rotate_key'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-rotateencryptionkey',
    parameterTypes: {
      pathParams: [],
      urlParams: ['batch_size', 'type'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      batch_size: z.any().optional().describe('Query parameter: batch_size'),
      type: z.any().optional().describe('Query parameter: type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rotateEncryptionKey API'),
  },
  {
    type: 'kibana.CreateEndpointList',
    connectorIdRequired: false,
    description: 'POST /api/endpoint_list - Kibana API endpoint',
    summary: 'Create an Elastic Endpoint rule exception list',
    methods: ['POST'],
    patterns: ['/api/endpoint_list'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createendpointlist',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from CreateEndpointList API'),
  },
  {
    type: 'kibana.DeleteEndpointListItem',
    connectorIdRequired: false,
    description: 'DELETE /api/endpoint_list/items - Kibana API endpoint',
    summary: 'Delete an Elastic Endpoint exception list item',
    methods: ['DELETE'],
    patterns: ['/api/endpoint_list/items'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteendpointlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'item_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      item_id: z.any().optional().describe('Query parameter: item_id'),
    }),
    outputSchema: z.any().describe('Response from DeleteEndpointListItem API'),
  },
  {
    type: 'kibana.ReadEndpointListItem',
    connectorIdRequired: false,
    description: 'GET /api/endpoint_list/items - Kibana API endpoint',
    summary: 'Get an Elastic Endpoint rule exception list item',
    methods: ['GET'],
    patterns: ['/api/endpoint_list/items'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readendpointlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'item_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      item_id: z.any().optional().describe('Query parameter: item_id'),
    }),
    outputSchema: z.any().describe('Response from ReadEndpointListItem API'),
  },
  {
    type: 'kibana.CreateEndpointListItem',
    connectorIdRequired: false,
    description: 'POST /api/endpoint_list/items - Kibana API endpoint',
    summary: 'Create an Elastic Endpoint rule exception list item',
    methods: ['POST'],
    patterns: ['/api/endpoint_list/items'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createendpointlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'comments',
        'description',
        'entries',
        'item_id',
        'meta',
        'name',
        'os_types',
        'tags',
        'type',
      ],
    },
    paramsSchema: CreateEndpointListItem_Body,
    outputSchema: z.any().describe('Response from CreateEndpointListItem API'),
  },
  {
    type: 'kibana.UpdateEndpointListItem',
    connectorIdRequired: false,
    description: 'PUT /api/endpoint_list/items - Kibana API endpoint',
    summary: 'Update an Elastic Endpoint rule exception list item',
    methods: ['PUT'],
    patterns: ['/api/endpoint_list/items'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateendpointlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        '_version',
        'comments',
        'description',
        'entries',
        'id',
        'item_id',
        'meta',
        'name',
        'os_types',
        'tags',
        'type',
      ],
    },
    paramsSchema: UpdateEndpointListItem_Body,
    outputSchema: z.any().describe('Response from UpdateEndpointListItem API'),
  },
  {
    type: 'kibana.FindEndpointListItems',
    connectorIdRequired: false,
    description: 'GET /api/endpoint_list/items/_find - Kibana API endpoint',
    summary: 'Get Elastic Endpoint exception list items',
    methods: ['GET'],
    patterns: ['/api/endpoint_list/items/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findendpointlistitems',
    parameterTypes: {
      pathParams: [],
      urlParams: ['filter', 'page', 'per_page', 'sort_field'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      filter: z.any().optional().describe('Query parameter: filter'),
      page: z.any().optional().describe('Query parameter: page'),
      per_page: z.any().optional().describe('Query parameter: per_page'),
      sort_field: z.any().optional().describe('Query parameter: sort_field'),
    }),
    outputSchema: z.any().describe('Response from FindEndpointListItems API'),
  },
  {
    type: 'kibana.EndpointGetActionsList',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/action - Kibana API endpoint',
    summary: 'Get response actions',
    methods: ['GET'],
    patterns: ['/api/endpoint/action'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointgetactionslist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'pageSize', 'commands', 'agentIds', 'userIds', 'startDate', 'endDate'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      pageSize: z.any().optional().describe('Query parameter: pageSize'),
      commands: z.any().optional().describe('Query parameter: commands'),
      agentIds: z.any().optional().describe('Query parameter: agentIds'),
      userIds: z.any().optional().describe('Query parameter: userIds'),
      startDate: z.any().optional().describe('Query parameter: startDate'),
      endDate: z.any().optional().describe('Query parameter: endDate'),
    }),
    outputSchema: z.any().describe('Response from EndpointGetActionsList API'),
  },
  {
    type: 'kibana.EndpointGetActionsStatus',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/action_status - Kibana API endpoint',
    summary: 'Get response actions status',
    methods: ['GET'],
    patterns: ['/api/endpoint/action_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointgetactionsstatus',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.any().optional().describe('Query parameter: query'),
    }),
    outputSchema: z.any().describe('Response from EndpointGetActionsStatus API'),
  },
  {
    type: 'kibana.EndpointGetActionsDetails',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/action/:action_id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/endpoint/action/{action_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointgetactionsdetails',
    parameterTypes: {
      pathParams: ['action_id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      action_id: z.string().describe('Path parameter: action_id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from EndpointGetActionsDetails API'),
  },
  {
    type: 'kibana.EndpointFileInfo',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/action/:action_id/file/:file_id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/endpoint/action/{action_id}/file/{file_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointfileinfo',
    parameterTypes: {
      pathParams: ['action_id', 'file_id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      action_id: z.string().describe('Path parameter: action_id (required)'),
      file_id: z.string().describe('Path parameter: file_id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from EndpointFileInfo API'),
  },
  {
    type: 'kibana.EndpointFileDownload',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/action/:action_id/file/:file_id/download - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/endpoint/action/{action_id}/file/{file_id}/download'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointfiledownload',
    parameterTypes: {
      pathParams: ['action_id', 'file_id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      action_id: z.string().describe('Path parameter: action_id (required)'),
      file_id: z.string().describe('Path parameter: file_id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from EndpointFileDownload API'),
  },
  {
    type: 'kibana.CancelAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/cancel - Kibana API endpoint',
    summary: 'Cancel a response action',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/cancel'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-cancelaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_CancelRouteRequestBody,
    outputSchema: z.any().describe('Response from CancelAction API'),
  },
  {
    type: 'kibana.EndpointExecuteAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/execute - Kibana API endpoint',
    summary: 'Run a command',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/execute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointexecuteaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_ExecuteRouteRequestBody,
    outputSchema: z.any().describe('Response from EndpointExecuteAction API'),
  },
  {
    type: 'kibana.EndpointGetFileAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/get_file - Kibana API endpoint',
    summary: 'Get a file',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/get_file'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointgetfileaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_GetFileRouteRequestBody,
    outputSchema: z.any().describe('Response from EndpointGetFileAction API'),
  },
  {
    type: 'kibana.EndpointIsolateAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/isolate - Kibana API endpoint',
    summary: 'Isolate an endpoint',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/isolate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointisolateaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: EndpointIsolateAction_Body,
    outputSchema: z.any().describe('Response from EndpointIsolateAction API'),
  },
  {
    type: 'kibana.EndpointKillProcessAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/kill_process - Kibana API endpoint',
    summary: 'Terminate a process',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/kill_process'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointkillprocessaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_KillProcessRouteRequestBody,
    outputSchema: z.any().describe('Response from EndpointKillProcessAction API'),
  },
  {
    type: 'kibana.EndpointGetProcessesAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/running_procs - Kibana API endpoint',
    summary: 'Get running processes',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/running_procs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointgetprocessesaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_GetProcessesRouteRequestBody,
    outputSchema: z.any().describe('Response from EndpointGetProcessesAction API'),
  },
  {
    type: 'kibana.RunScriptAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/runscript - Kibana API endpoint',
    summary: 'Run a script',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/runscript'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-runscriptaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_RunScriptRouteRequestBody,
    outputSchema: z.any().describe('Response from RunScriptAction API'),
  },
  {
    type: 'kibana.EndpointScanAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/scan - Kibana API endpoint',
    summary: 'Scan a file or directory',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/scan'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointscanaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_ScanRouteRequestBody,
    outputSchema: z.any().describe('Response from EndpointScanAction API'),
  },
  {
    type: 'kibana.EndpointGetActionsState',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/action/state - Kibana API endpoint',
    summary: 'Get actions state',
    methods: ['GET'],
    patterns: ['/api/endpoint/action/state'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointgetactionsstate',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from EndpointGetActionsState API'),
  },
  {
    type: 'kibana.EndpointSuspendProcessAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/suspend_process - Kibana API endpoint',
    summary: 'Suspend a process',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/suspend_process'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointsuspendprocessaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_SuspendProcessRouteRequestBody,
    outputSchema: z.any().describe('Response from EndpointSuspendProcessAction API'),
  },
  {
    type: 'kibana.EndpointUnisolateAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/unisolate - Kibana API endpoint',
    summary: 'Release an isolated endpoint',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/unisolate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointunisolateaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: EndpointIsolateAction_Body,
    outputSchema: z.any().describe('Response from EndpointUnisolateAction API'),
  },
  {
    type: 'kibana.EndpointUploadAction',
    connectorIdRequired: false,
    description: 'POST /api/endpoint/action/upload - Kibana API endpoint',
    summary: 'Upload a file',
    methods: ['POST'],
    patterns: ['/api/endpoint/action/upload'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointuploadaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
    },
    paramsSchema: Security_Endpoint_Management_API_UploadRouteRequestBody,
    outputSchema: z.any().describe('Response from EndpointUploadAction API'),
  },
  {
    type: 'kibana.GetEndpointMetadataList',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/metadata - Kibana API endpoint',
    summary: 'Get a metadata list',
    methods: ['GET'],
    patterns: ['/api/endpoint/metadata'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getendpointmetadatalist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'pageSize', 'kuery'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      pageSize: z.any().optional().describe('Query parameter: pageSize'),
      kuery: z.any().optional().describe('Query parameter: kuery'),
    }),
    outputSchema: z.any().describe('Response from GetEndpointMetadataList API'),
  },
  {
    type: 'kibana.GetEndpointMetadata',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/metadata/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/endpoint/metadata/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getendpointmetadata',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from GetEndpointMetadata API'),
  },
  {
    type: 'kibana.GetPolicyResponse',
    connectorIdRequired: false,
    description: 'GET /api/endpoint/policy_response - Kibana API endpoint',
    summary: 'Get a policy response',
    methods: ['GET'],
    patterns: ['/api/endpoint/policy_response'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getpolicyresponse',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.any().optional().describe('Query parameter: query'),
    }),
    outputSchema: z.any().describe('Response from GetPolicyResponse API'),
  },
  {
    type: 'kibana.GetProtectionUpdatesNote',
    connectorIdRequired: false,
    description:
      'GET /api/endpoint/protection_updates_note/:package_policy_id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/endpoint/protection_updates_note/{package_policy_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getprotectionupdatesnote',
    parameterTypes: {
      pathParams: ['package_policy_id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      package_policy_id: z.string().describe('Path parameter: package_policy_id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from GetProtectionUpdatesNote API'),
  },
  {
    type: 'kibana.CreateUpdateProtectionUpdatesNote',
    connectorIdRequired: false,
    description:
      'POST /api/endpoint/protection_updates_note/:package_policy_id - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/endpoint/protection_updates_note/{package_policy_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createupdateprotectionupdatesnote',
    parameterTypes: {
      pathParams: ['package_policy_id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      package_policy_id: z.string().describe('Path parameter: package_policy_id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from CreateUpdateProtectionUpdatesNote API'),
  },
  {
    type: 'kibana.DeleteMonitoringEngine',
    connectorIdRequired: false,
    description: 'DELETE /api/entity_analytics/monitoring/engine/delete - Kibana API endpoint',
    summary: 'Delete the Privilege Monitoring Engine',
    methods: ['DELETE'],
    patterns: ['/api/entity_analytics/monitoring/engine/delete'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletemonitoringengine',
    parameterTypes: {
      pathParams: [],
      urlParams: ['data'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      data: z.any().optional().describe('Query parameter: data'),
    }),
    outputSchema: z.any().describe('Response from DeleteMonitoringEngine API'),
  },
  {
    type: 'kibana.DisableMonitoringEngine',
    connectorIdRequired: false,
    description: 'POST /api/entity_analytics/monitoring/engine/disable - Kibana API endpoint',
    summary: 'Disable the Privilege Monitoring Engine',
    methods: ['POST'],
    patterns: ['/api/entity_analytics/monitoring/engine/disable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-disablemonitoringengine',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from DisableMonitoringEngine API'),
  },
  {
    type: 'kibana.InitMonitoringEngine',
    connectorIdRequired: false,
    description: 'POST /api/entity_analytics/monitoring/engine/init - Kibana API endpoint',
    summary: 'Initialize the Privilege Monitoring Engine',
    methods: ['POST'],
    patterns: ['/api/entity_analytics/monitoring/engine/init'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-initmonitoringengine',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from InitMonitoringEngine API'),
  },
  {
    type: 'kibana.ScheduleMonitoringEngine',
    connectorIdRequired: false,
    description: 'POST /api/entity_analytics/monitoring/engine/schedule_now - Kibana API endpoint',
    summary: 'Schedule the Privilege Monitoring Engine',
    methods: ['POST'],
    patterns: ['/api/entity_analytics/monitoring/engine/schedule_now'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-schedulemonitoringengine',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ScheduleMonitoringEngine API'),
  },
  {
    type: 'kibana.PrivMonHealth',
    connectorIdRequired: false,
    description: 'GET /api/entity_analytics/monitoring/privileges/health - Kibana API endpoint',
    summary: 'Health check on Privilege Monitoring',
    methods: ['GET'],
    patterns: ['/api/entity_analytics/monitoring/privileges/health'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-privmonhealth',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from PrivMonHealth API'),
  },
  {
    type: 'kibana.PrivMonPrivileges',
    connectorIdRequired: false,
    description: 'GET /api/entity_analytics/monitoring/privileges/privileges - Kibana API endpoint',
    summary: 'Run a privileges check on Privilege Monitoring',
    methods: ['GET'],
    patterns: ['/api/entity_analytics/monitoring/privileges/privileges'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-privmonprivileges',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from PrivMonPrivileges API'),
  },
  {
    type: 'kibana.CreatePrivMonUser',
    connectorIdRequired: false,
    description: 'POST /api/entity_analytics/monitoring/users - Kibana API endpoint',
    summary: 'Create a new monitored user',
    methods: ['POST'],
    patterns: ['/api/entity_analytics/monitoring/users'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createprivmonuser',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['user', 'name'],
    },
    paramsSchema: Security_Entity_Analytics_API_UserName,
    outputSchema: z.any().describe('Response from CreatePrivMonUser API'),
  },
  {
    type: 'kibana.PrivmonBulkUploadUsersCSV',
    connectorIdRequired: false,
    description: 'POST /api/entity_analytics/monitoring/users/_csv - Kibana API endpoint',
    summary: 'Upsert multiple monitored users via CSV upload',
    methods: ['POST'],
    patterns: ['/api/entity_analytics/monitoring/users/_csv'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-privmonbulkuploaduserscsv',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from PrivmonBulkUploadUsersCSV API'),
  },
  {
    type: 'kibana.DeletePrivMonUser',
    connectorIdRequired: false,
    description: 'DELETE /api/entity_analytics/monitoring/users/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/entity_analytics/monitoring/users/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteprivmonuser',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from DeletePrivMonUser API'),
  },
  {
    type: 'kibana.UpdatePrivMonUser',
    connectorIdRequired: false,
    description: 'PUT /api/entity_analytics/monitoring/users/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/entity_analytics/monitoring/users/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateprivmonuser',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Security_Entity_Analytics_API_MonitoredUserUpdateDoc;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from UpdatePrivMonUser API'),
  },
  {
    type: 'kibana.ListPrivMonUsers',
    connectorIdRequired: false,
    description: 'GET /api/entity_analytics/monitoring/users/list - Kibana API endpoint',
    summary: 'List all monitored users',
    methods: ['GET'],
    patterns: ['/api/entity_analytics/monitoring/users/list'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-listprivmonusers',
    parameterTypes: {
      pathParams: [],
      urlParams: ['kql'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      kql: z.any().optional().describe('Query parameter: kql'),
    }),
    outputSchema: z.any().describe('Response from ListPrivMonUsers API'),
  },
  {
    type: 'kibana.InstallPrivilegedAccessDetectionPackage',
    connectorIdRequired: false,
    description:
      'POST /api/entity_analytics/privileged_user_monitoring/pad/install - Kibana API endpoint',
    summary:
      'Installs the privileged access detection package for the Entity Analytics privileged user monitoring experience',
    methods: ['POST'],
    patterns: ['/api/entity_analytics/privileged_user_monitoring/pad/install'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-installprivilegedaccessdetectionpackage',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from InstallPrivilegedAccessDetectionPackage API'),
  },
  {
    type: 'kibana.GetPrivilegedAccessDetectionPackageStatus',
    connectorIdRequired: false,
    description:
      'GET /api/entity_analytics/privileged_user_monitoring/pad/status - Kibana API endpoint',
    summary:
      'Gets the status of the privileged access detection package for the Entity Analytics privileged user monitoring experience',
    methods: ['GET'],
    patterns: ['/api/entity_analytics/privileged_user_monitoring/pad/status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getprivilegedaccessdetectionpackagestatus',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from GetPrivilegedAccessDetectionPackageStatus API'),
  },
  {
    type: 'kibana.InitEntityStore',
    connectorIdRequired: false,
    description: 'POST /api/entity_store/enable - Kibana API endpoint',
    summary: 'Initialize the Entity Store',
    methods: ['POST'],
    patterns: ['/api/entity_store/enable'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-initentitystore',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'delay',
        'docsPerSecond',
        'enrichPolicyExecutionInterval',
        'entityTypes',
        'fieldHistoryLength',
        'filter',
        'frequency',
        'indexPattern',
        'lookbackPeriod',
        'maxPageSearchSize',
        'timeout',
        'timestampField',
      ],
    },
    paramsSchema: InitEntityStore_Body,
    outputSchema: z.any().describe('Response from InitEntityStore API'),
  },
  {
    type: 'kibana.ListEntityEngines',
    connectorIdRequired: false,
    description: 'GET /api/entity_store/engines - Kibana API endpoint',
    summary: 'List the Entity Engines',
    methods: ['GET'],
    patterns: ['/api/entity_store/engines'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-listentityengines',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ListEntityEngines API'),
  },
  {
    type: 'kibana.DeleteEntityEngine',
    connectorIdRequired: false,
    description: 'DELETE /api/entity_store/engines/:entityType - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/entity_store/engines/{entityType}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteentityengine',
    parameterTypes: {
      pathParams: ['entityType'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      entityType: z.string().describe('Path parameter: entityType (required)'),
    }),
    outputSchema: z.any().describe('Response from DeleteEntityEngine API'),
  },
  {
    type: 'kibana.GetEntityEngine',
    connectorIdRequired: false,
    description: 'GET /api/entity_store/engines/:entityType - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/entity_store/engines/{entityType}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getentityengine',
    parameterTypes: {
      pathParams: ['entityType'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      entityType: z.string().describe('Path parameter: entityType (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from GetEntityEngine API'),
  },
  {
    type: 'kibana.InitEntityEngine',
    connectorIdRequired: false,
    description: 'POST /api/entity_store/engines/:entityType/init - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/entity_store/engines/{entityType}/init'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-initentityengine',
    parameterTypes: {
      pathParams: ['entityType'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = InitEntityEngine_Body;
      const additionalFields = z.object({
        entityType: z.string().describe('Path parameter: entityType (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from InitEntityEngine API'),
  },
  {
    type: 'kibana.StartEntityEngine',
    connectorIdRequired: false,
    description: 'POST /api/entity_store/engines/:entityType/start - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/entity_store/engines/{entityType}/start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-startentityengine',
    parameterTypes: {
      pathParams: ['entityType'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      entityType: z.string().describe('Path parameter: entityType (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from StartEntityEngine API'),
  },
  {
    type: 'kibana.StopEntityEngine',
    connectorIdRequired: false,
    description: 'POST /api/entity_store/engines/:entityType/stop - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/entity_store/engines/{entityType}/stop'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-stopentityengine',
    parameterTypes: {
      pathParams: ['entityType'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      entityType: z.string().describe('Path parameter: entityType (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from StopEntityEngine API'),
  },
  {
    type: 'kibana.ApplyEntityEngineDataviewIndices',
    connectorIdRequired: false,
    description: 'POST /api/entity_store/engines/apply_dataview_indices - Kibana API endpoint',
    summary: 'Apply DataView indices to all installed engines',
    methods: ['POST'],
    patterns: ['/api/entity_store/engines/apply_dataview_indices'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-applyentityenginedataviewindices',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ApplyEntityEngineDataviewIndices API'),
  },
  {
    type: 'kibana.UpsertEntity',
    connectorIdRequired: false,
    description: 'PUT /api/entity_store/entities/:entityType - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/entity_store/entities/{entityType}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-upsertentity',
    parameterTypes: {
      pathParams: ['entityType'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Security_Entity_Analytics_API_Entity;
      const additionalFields = z.object({
        entityType: z.string().describe('Path parameter: entityType (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from UpsertEntity API'),
  },
  {
    type: 'kibana.ListEntities',
    connectorIdRequired: false,
    description: 'GET /api/entity_store/entities/list - Kibana API endpoint',
    summary: 'List Entity Store Entities',
    methods: ['GET'],
    patterns: ['/api/entity_store/entities/list'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-listentities',
    parameterTypes: {
      pathParams: [],
      urlParams: ['sort_field'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      sort_field: z.any().optional().describe('Query parameter: sort_field'),
    }),
    outputSchema: z.any().describe('Response from ListEntities API'),
  },
  {
    type: 'kibana.GetEntityStoreStatus',
    connectorIdRequired: false,
    description: 'GET /api/entity_store/status - Kibana API endpoint',
    summary: 'Get the status of the Entity Store',
    methods: ['GET'],
    patterns: ['/api/entity_store/status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getentitystorestatus',
    parameterTypes: {
      pathParams: [],
      urlParams: ['include_components'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      include_components: z.any().optional().describe('Query parameter: include_components'),
    }),
    outputSchema: z.any().describe('Response from GetEntityStoreStatus API'),
  },
  {
    type: 'kibana.DeleteExceptionList',
    connectorIdRequired: false,
    description: 'DELETE /api/exception_lists - Kibana API endpoint',
    summary: 'Delete an exception list',
    methods: ['DELETE'],
    patterns: ['/api/exception_lists'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteexceptionlist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'list_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      list_id: z.any().optional().describe('Query parameter: list_id'),
    }),
    outputSchema: z.any().describe('Response from DeleteExceptionList API'),
  },
  {
    type: 'kibana.ReadExceptionList',
    connectorIdRequired: false,
    description: 'GET /api/exception_lists - Kibana API endpoint',
    summary: 'Get exception list details',
    methods: ['GET'],
    patterns: ['/api/exception_lists'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readexceptionlist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'list_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      list_id: z.any().optional().describe('Query parameter: list_id'),
    }),
    outputSchema: z.any().describe('Response from ReadExceptionList API'),
  },
  {
    type: 'kibana.CreateExceptionList',
    connectorIdRequired: false,
    description: 'POST /api/exception_lists - Kibana API endpoint',
    summary: 'Create an exception list',
    methods: ['POST'],
    patterns: ['/api/exception_lists'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createexceptionlist',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'description',
        'list_id',
        'meta',
        'name',
        'namespace_type',
        'os_types',
        'tags',
        'type',
        'version',
      ],
    },
    paramsSchema: CreateExceptionList_Body,
    outputSchema: z.any().describe('Response from CreateExceptionList API'),
  },
  {
    type: 'kibana.UpdateExceptionList',
    connectorIdRequired: false,
    description: 'PUT /api/exception_lists - Kibana API endpoint',
    summary: 'Update an exception list',
    methods: ['PUT'],
    patterns: ['/api/exception_lists'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateexceptionlist',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        '_version',
        'description',
        'id',
        'list_id',
        'meta',
        'name',
        'namespace_type',
        'os_types',
        'tags',
        'type',
        'version',
      ],
    },
    paramsSchema: UpdateExceptionList_Body,
    outputSchema: z.any().describe('Response from UpdateExceptionList API'),
  },
  {
    type: 'kibana.DuplicateExceptionList',
    connectorIdRequired: false,
    description: 'POST /api/exception_lists/_duplicate - Kibana API endpoint',
    summary: 'Duplicate an exception list',
    methods: ['POST'],
    patterns: ['/api/exception_lists/_duplicate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-duplicateexceptionlist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['list_id'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      list_id: z.any().optional().describe('Query parameter: list_id'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from DuplicateExceptionList API'),
  },
  {
    type: 'kibana.ExportExceptionList',
    connectorIdRequired: false,
    description: 'POST /api/exception_lists/_export - Kibana API endpoint',
    summary: 'Export an exception list',
    methods: ['POST'],
    patterns: ['/api/exception_lists/_export'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportexceptionlist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'list_id'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      list_id: z.any().optional().describe('Query parameter: list_id'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ExportExceptionList API'),
  },
  {
    type: 'kibana.FindExceptionLists',
    connectorIdRequired: false,
    description: 'GET /api/exception_lists/_find - Kibana API endpoint',
    summary: 'Get exception lists',
    methods: ['GET'],
    patterns: ['/api/exception_lists/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findexceptionlists',
    parameterTypes: {
      pathParams: [],
      urlParams: ['filter'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      filter: z.any().optional().describe('Query parameter: filter'),
    }),
    outputSchema: z.any().describe('Response from FindExceptionLists API'),
  },
  {
    type: 'kibana.ImportExceptionList',
    connectorIdRequired: false,
    description: 'POST /api/exception_lists/_import - Kibana API endpoint',
    summary: 'Import an exception list',
    methods: ['POST'],
    patterns: ['/api/exception_lists/_import'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-importexceptionlist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['overwrite', 'as_new_list'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      overwrite: z.any().optional().describe('Query parameter: overwrite'),
      as_new_list: z.any().optional().describe('Query parameter: as_new_list'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ImportExceptionList API'),
  },
  {
    type: 'kibana.DeleteExceptionListItem',
    connectorIdRequired: false,
    description: 'DELETE /api/exception_lists/items - Kibana API endpoint',
    summary: 'Delete an exception list item',
    methods: ['DELETE'],
    patterns: ['/api/exception_lists/items'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteexceptionlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'item_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      item_id: z.any().optional().describe('Query parameter: item_id'),
    }),
    outputSchema: z.any().describe('Response from DeleteExceptionListItem API'),
  },
  {
    type: 'kibana.ReadExceptionListItem',
    connectorIdRequired: false,
    description: 'GET /api/exception_lists/items - Kibana API endpoint',
    summary: 'Get an exception list item',
    methods: ['GET'],
    patterns: ['/api/exception_lists/items'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readexceptionlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'item_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      item_id: z.any().optional().describe('Query parameter: item_id'),
    }),
    outputSchema: z.any().describe('Response from ReadExceptionListItem API'),
  },
  {
    type: 'kibana.CreateExceptionListItem',
    connectorIdRequired: false,
    description: 'POST /api/exception_lists/items - Kibana API endpoint',
    summary: 'Create an exception list item',
    methods: ['POST'],
    patterns: ['/api/exception_lists/items'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createexceptionlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['comments', 'description', 'entries', 'expire_time', 'offset'],
    },
    paramsSchema: CreateExceptionListItem_Body,
    outputSchema: z.any().describe('Response from CreateExceptionListItem API'),
  },
  {
    type: 'kibana.UpdateExceptionListItem',
    connectorIdRequired: false,
    description: 'PUT /api/exception_lists/items - Kibana API endpoint',
    summary: 'Update an exception list item',
    methods: ['PUT'],
    patterns: ['/api/exception_lists/items'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateexceptionlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['_version', 'comments', 'description', 'entries', 'expire_time', 'offset'],
    },
    paramsSchema: UpdateExceptionListItem_Body,
    outputSchema: z.any().describe('Response from UpdateExceptionListItem API'),
  },
  {
    type: 'kibana.FindExceptionListItems',
    connectorIdRequired: false,
    description: 'GET /api/exception_lists/items/_find - Kibana API endpoint',
    summary: 'Get exception list items',
    methods: ['GET'],
    patterns: ['/api/exception_lists/items/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findexceptionlistitems',
    parameterTypes: {
      pathParams: [],
      urlParams: ['list_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      list_id: z.any().optional().describe('Query parameter: list_id'),
    }),
    outputSchema: z.any().describe('Response from FindExceptionListItems API'),
  },
  {
    type: 'kibana.ReadExceptionListSummary',
    connectorIdRequired: false,
    description: 'GET /api/exception_lists/summary - Kibana API endpoint',
    summary: 'Get an exception list summary',
    methods: ['GET'],
    patterns: ['/api/exception_lists/summary'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readexceptionlistsummary',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'list_id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      list_id: z.any().optional().describe('Query parameter: list_id'),
    }),
    outputSchema: z.any().describe('Response from ReadExceptionListSummary API'),
  },
  {
    type: 'kibana.CreateSharedExceptionList',
    connectorIdRequired: false,
    description: 'POST /api/exceptions/shared - Kibana API endpoint',
    summary: 'Create a shared exception list',
    methods: ['POST'],
    patterns: ['/api/exceptions/shared'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createsharedexceptionlist',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['description', 'name'],
    },
    paramsSchema: CreateSharedExceptionList_Body,
    outputSchema: z.any().describe('Response from CreateSharedExceptionList API'),
  },
  {
    type: 'kibana.get_features',
    connectorIdRequired: false,
    description: 'GET /api/features - Kibana API endpoint',
    summary: 'Get features',
    methods: ['GET'],
    patterns: ['/api/features'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_features',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_features API'),
  },
  {
    type: 'kibana.get_fleet_agent_download_sources',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_download_sources - Kibana API endpoint',
    summary: 'Get agent binary download sources',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_download_sources'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_download_sources',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agent_download_sources API'),
  },
  {
    type: 'kibana.post_fleet_agent_download_sources',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agent_download_sources - Kibana API endpoint',
    summary: 'Create an agent binary download source',
    methods: ['POST'],
    patterns: ['/api/fleet/agent_download_sources'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agent_download_sources',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['host', 'id', 'is_default', 'name', 'proxy_id', 'secrets', 'ssl', 'key', 'id'],
    },
    paramsSchema: post_fleet_agent_download_sources_Body,
    outputSchema: z.any().describe('Response from post_fleet_agent_download_sources API'),
  },
  {
    type: 'kibana.delete_fleet_agent_download_sources_sourceid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/agent_download_sources/:sourceId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_agent_download_sources_sourceid',
    parameterTypes: {
      pathParams: ['sourceId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      sourceId: z.string().describe('Path parameter: sourceId (required)'),
    }),
    outputSchema: z
      .any()
      .describe('Response from delete_fleet_agent_download_sources_sourceid API'),
  },
  {
    type: 'kibana.get_fleet_agent_download_sources_sourceid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_download_sources/:sourceId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_download_sources_sourceid',
    parameterTypes: {
      pathParams: ['sourceId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      sourceId: z.string().describe('Path parameter: sourceId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agent_download_sources_sourceid API'),
  },
  {
    type: 'kibana.put_fleet_agent_download_sources_sourceid',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/agent_download_sources/:sourceId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/agent_download_sources/{sourceId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_agent_download_sources_sourceid',
    parameterTypes: {
      pathParams: ['sourceId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_fleet_agent_download_sources_Body;
      const additionalFields = z.object({
        sourceId: z.string().describe('Path parameter: sourceId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_agent_download_sources_sourceid API'),
  },
  {
    type: 'kibana.get_fleet_agent_policies',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_policies - Kibana API endpoint',
    summary: 'Get agent policies',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_policies'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_policies',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'perPage', 'sortField'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      sortField: z.any().optional().describe('Query parameter: sortField'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agent_policies API'),
  },
  {
    type: 'kibana.post_fleet_agent_policies',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agent_policies - Kibana API endpoint',
    summary: 'Create an agent policy',
    methods: ['POST'],
    patterns: ['/api/fleet/agent_policies'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agent_policies',
    parameterTypes: {
      pathParams: [],
      urlParams: ['sys_monitoring'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_fleet_agent_policies_Body;
      const additionalFields = z.object({
        sys_monitoring: z.any().optional().describe('Query parameter: sys_monitoring'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_fleet_agent_policies API'),
  },
  {
    type: 'kibana.post_fleet_agent_policies_bulk_get',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agent_policies/_bulk_get - Kibana API endpoint',
    summary: 'Bulk get agent policies',
    methods: ['POST'],
    patterns: ['/api/fleet/agent_policies/_bulk_get'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agent_policies_bulk_get',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['full', 'ids', 'ignoreMissing'],
    },
    paramsSchema: post_fleet_agent_policies_bulk_get_Body,
    outputSchema: z.any().describe('Response from post_fleet_agent_policies_bulk_get API'),
  },
  {
    type: 'kibana.get_fleet_agent_policies_agentpolicyid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_policies/:agentPolicyId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_policies_agentpolicyid',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentPolicyId: z.string().describe('Path parameter: agentPolicyId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agent_policies_agentpolicyid API'),
  },
  {
    type: 'kibana.put_fleet_agent_policies_agentpolicyid',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/agent_policies/:agentPolicyId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_agent_policies_agentpolicyid',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_fleet_agent_policies_agentpolicyid_Body;
      const additionalFields = z.object({
        agentPolicyId: z.string().describe('Path parameter: agentPolicyId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_agent_policies_agentpolicyid API'),
  },
  {
    type: 'kibana.get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status',
    connectorIdRequired: false,
    description:
      'GET /api/fleet/agent_policies/:agentPolicyId/auto_upgrade_agents_status - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}/auto_upgrade_agents_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentPolicyId: z.string().describe('Path parameter: agentPolicyId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z
      .any()
      .describe(
        'Response from get_fleet_agent_policies_agentpolicyid_auto_upgrade_agents_status API'
      ),
  },
  {
    type: 'kibana.post_fleet_agent_policies_agentpolicyid_copy',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agent_policies/:agentPolicyId/copy - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}/copy'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agent_policies_agentpolicyid_copy',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_fleet_agent_policies_agentpolicyid_copy_Body;
      const additionalFields = z.object({
        agentPolicyId: z.string().describe('Path parameter: agentPolicyId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z
      .any()
      .describe('Response from post_fleet_agent_policies_agentpolicyid_copy API'),
  },
  {
    type: 'kibana.get_fleet_agent_policies_agentpolicyid_download',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_policies/:agentPolicyId/download - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}/download'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_policies_agentpolicyid_download',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: ['download', 'standalone', 'kubernetes'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentPolicyId: z.string().describe('Path parameter: agentPolicyId (required)'),
      download: z.any().optional().describe('Query parameter: download'),
      standalone: z.any().optional().describe('Query parameter: standalone'),
      kubernetes: z.any().optional().describe('Query parameter: kubernetes'),
    }),
    outputSchema: z
      .any()
      .describe('Response from get_fleet_agent_policies_agentpolicyid_download API'),
  },
  {
    type: 'kibana.get_fleet_agent_policies_agentpolicyid_full',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_policies/:agentPolicyId/full - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}/full'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_policies_agentpolicyid_full',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: ['download', 'standalone', 'kubernetes'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentPolicyId: z.string().describe('Path parameter: agentPolicyId (required)'),
      download: z.any().optional().describe('Query parameter: download'),
      standalone: z.any().optional().describe('Query parameter: standalone'),
      kubernetes: z.any().optional().describe('Query parameter: kubernetes'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agent_policies_agentpolicyid_full API'),
  },
  {
    type: 'kibana.get_fleet_agent_policies_agentpolicyid_outputs',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_policies/:agentPolicyId/outputs - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_policies/{agentPolicyId}/outputs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_policies_agentpolicyid_outputs',
    parameterTypes: {
      pathParams: ['agentPolicyId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentPolicyId: z.string().describe('Path parameter: agentPolicyId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z
      .any()
      .describe('Response from get_fleet_agent_policies_agentpolicyid_outputs API'),
  },
  {
    type: 'kibana.post_fleet_agent_policies_delete',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agent_policies/delete - Kibana API endpoint',
    summary: 'Delete an agent policy',
    methods: ['POST'],
    patterns: ['/api/fleet/agent_policies/delete'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agent_policies_delete',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agentPolicyId', 'force'],
    },
    paramsSchema: post_fleet_agent_policies_delete_Body,
    outputSchema: z.any().describe('Response from post_fleet_agent_policies_delete API'),
  },
  {
    type: 'kibana.post_fleet_agent_policies_outputs',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agent_policies/outputs - Kibana API endpoint',
    summary: 'Get outputs for agent policies',
    methods: ['POST'],
    patterns: ['/api/fleet/agent_policies/outputs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agent_policies_outputs',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['ids'],
    },
    paramsSchema: post_fleet_agent_policies_outputs_Body,
    outputSchema: z.any().describe('Response from post_fleet_agent_policies_outputs API'),
  },
  {
    type: 'kibana.get_fleet_agent_status',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_status - Kibana API endpoint',
    summary: 'Get an agent status summary',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['policyId', 'policyIds', 'kuery'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      policyId: z.any().optional().describe('Query parameter: policyId'),
      policyIds: z.any().optional().describe('Query parameter: policyIds'),
      kuery: z.any().optional().describe('Query parameter: kuery'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agent_status API'),
  },
  {
    type: 'kibana.get_fleet_agent_status_data',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agent_status/data - Kibana API endpoint',
    summary: 'Get incoming agent data',
    methods: ['GET'],
    patterns: ['/api/fleet/agent_status/data'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agent_status_data',
    parameterTypes: {
      pathParams: [],
      urlParams: ['agentsIds', 'pkgName', 'pkgVersion', 'previewData'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentsIds: z.any().optional().describe('Query parameter: agentsIds'),
      pkgName: z.any().optional().describe('Query parameter: pkgName'),
      pkgVersion: z.any().optional().describe('Query parameter: pkgVersion'),
      previewData: z.any().optional().describe('Query parameter: previewData'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agent_status_data API'),
  },
  {
    type: 'kibana.get_fleet_agents',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agents - Kibana API endpoint',
    summary: 'Get agents',
    methods: ['GET'],
    patterns: ['/api/fleet/agents'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agents',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'page',
        'perPage',
        'kuery',
        'showAgentless',
        'showInactive',
        'withMetrics',
        'showUpgradeable',
        'getStatusSummary',
        'sortField',
      ],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      kuery: z.any().optional().describe('Query parameter: kuery'),
      showAgentless: z.any().optional().describe('Query parameter: showAgentless'),
      showInactive: z.any().optional().describe('Query parameter: showInactive'),
      withMetrics: z.any().optional().describe('Query parameter: withMetrics'),
      showUpgradeable: z.any().optional().describe('Query parameter: showUpgradeable'),
      getStatusSummary: z.any().optional().describe('Query parameter: getStatusSummary'),
      sortField: z.any().optional().describe('Query parameter: sortField'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agents API'),
  },
  {
    type: 'kibana.post_fleet_agents',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents - Kibana API endpoint',
    summary: 'Get agents by action ids',
    methods: ['POST'],
    patterns: ['/api/fleet/agents'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['actionIds'],
    },
    paramsSchema: post_fleet_agents_Body,
    outputSchema: z.any().describe('Response from post_fleet_agents API'),
  },
  {
    type: 'kibana.delete_fleet_agents_agentid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/agents/:agentId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/agents/{agentId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_agents_agentid',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentId: z.string().describe('Path parameter: agentId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_fleet_agents_agentid API'),
  },
  {
    type: 'kibana.get_fleet_agents_agentid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agents/:agentId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agents/{agentId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agents_agentid',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: ['withMetrics'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentId: z.string().describe('Path parameter: agentId (required)'),
      withMetrics: z.any().optional().describe('Query parameter: withMetrics'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agents_agentid API'),
  },
  {
    type: 'kibana.put_fleet_agents_agentid',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/agents/:agentId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/agents/{agentId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_agents_agentid',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_fleet_agents_agentid_Body;
      const additionalFields = z.object({
        agentId: z.string().describe('Path parameter: agentId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_agents_agentid API'),
  },
  {
    type: 'kibana.post_fleet_agents_agentid_actions',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/:agentId/actions - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/{agentId}/actions'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_agentid_actions',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_fleet_agents_agentid_actions_Body;
      const additionalFields = z.object({
        agentId: z.string().describe('Path parameter: agentId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_fleet_agents_agentid_actions API'),
  },
  {
    type: 'kibana.post_fleet_agents_agentid_reassign',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/:agentId/reassign - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/{agentId}/reassign'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_agentid_reassign',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      agentId: z.string().describe('Path parameter: agentId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_agents_agentid_reassign API'),
  },
  {
    type: 'kibana.post_fleet_agents_agentid_request_diagnostics',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/:agentId/request_diagnostics - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/{agentId}/request_diagnostics'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_agentid_request_diagnostics',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      agentId: z.string().describe('Path parameter: agentId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z
      .any()
      .describe('Response from post_fleet_agents_agentid_request_diagnostics API'),
  },
  {
    type: 'kibana.post_fleet_agents_agentid_unenroll',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/:agentId/unenroll - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/{agentId}/unenroll'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_agentid_unenroll',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      agentId: z.string().describe('Path parameter: agentId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_agents_agentid_unenroll API'),
  },
  {
    type: 'kibana.post_fleet_agents_agentid_upgrade',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/:agentId/upgrade - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/{agentId}/upgrade'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_agentid_upgrade',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_fleet_agents_agentid_upgrade_Body;
      const additionalFields = z.object({
        agentId: z.string().describe('Path parameter: agentId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_fleet_agents_agentid_upgrade API'),
  },
  {
    type: 'kibana.get_fleet_agents_agentid_uploads',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agents/:agentId/uploads - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agents/{agentId}/uploads'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agents_agentid_uploads',
    parameterTypes: {
      pathParams: ['agentId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      agentId: z.string().describe('Path parameter: agentId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agents_agentid_uploads API'),
  },
  {
    type: 'kibana.get_fleet_agents_action_status',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agents/action_status - Kibana API endpoint',
    summary: 'Get an agent action status',
    methods: ['GET'],
    patterns: ['/api/fleet/agents/action_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agents_action_status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'perPage', 'date', 'latest', 'errorSize'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      date: z.any().optional().describe('Query parameter: date'),
      latest: z.any().optional().describe('Query parameter: latest'),
      errorSize: z.any().optional().describe('Query parameter: errorSize'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agents_action_status API'),
  },
  {
    type: 'kibana.post_fleet_agents_actions_actionid_cancel',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/actions/:actionId/cancel - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/actions/{actionId}/cancel'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_actions_actionid_cancel',
    parameterTypes: {
      pathParams: ['actionId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      actionId: z.string().describe('Path parameter: actionId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_agents_actions_actionid_cancel API'),
  },
  {
    type: 'kibana.get_fleet_agents_available_versions',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agents/available_versions - Kibana API endpoint',
    summary: 'Get available agent versions',
    methods: ['GET'],
    patterns: ['/api/fleet/agents/available_versions'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agents_available_versions',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agents_available_versions API'),
  },
  {
    type: 'kibana.post_fleet_agents_bulk_reassign',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/bulk_reassign - Kibana API endpoint',
    summary: 'Bulk reassign agents',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/bulk_reassign'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_bulk_reassign',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agents', 'batchSize', 'includeInactive', 'policy_id'],
    },
    paramsSchema: post_fleet_agents_bulk_reassign_Body,
    outputSchema: z.any().describe('Response from post_fleet_agents_bulk_reassign API'),
  },
  {
    type: 'kibana.post_fleet_agents_bulk_request_diagnostics',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/bulk_request_diagnostics - Kibana API endpoint',
    summary: 'Bulk request diagnostics from agents',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/bulk_request_diagnostics'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_bulk_request_diagnostics',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['additional_metrics', 'agents', 'batchSize'],
    },
    paramsSchema: post_fleet_agents_bulk_request_diagnostics_Body,
    outputSchema: z.any().describe('Response from post_fleet_agents_bulk_request_diagnostics API'),
  },
  {
    type: 'kibana.post_fleet_agents_bulk_unenroll',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/bulk_unenroll - Kibana API endpoint',
    summary: 'Bulk unenroll agents',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/bulk_unenroll'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_bulk_unenroll',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agents', 'batchSize', 'force', 'includeInactive', 'revoke'],
    },
    paramsSchema: post_fleet_agents_bulk_unenroll_Body,
    outputSchema: z.any().describe('Response from post_fleet_agents_bulk_unenroll API'),
  },
  {
    type: 'kibana.post_fleet_agents_bulk_update_agent_tags',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/bulk_update_agent_tags - Kibana API endpoint',
    summary: 'Bulk update agent tags',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/bulk_update_agent_tags'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_bulk_update_agent_tags',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agents', 'batchSize', 'includeInactive', 'tagsToAdd', 'tagsToRemove'],
    },
    paramsSchema: post_fleet_agents_bulk_update_agent_tags_Body,
    outputSchema: z.any().describe('Response from post_fleet_agents_bulk_update_agent_tags API'),
  },
  {
    type: 'kibana.post_fleet_agents_bulk_upgrade',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/bulk_upgrade - Kibana API endpoint',
    summary: 'Bulk upgrade agents',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/bulk_upgrade'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_bulk_upgrade',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'agents',
        'batchSize',
        'force',
        'includeInactive',
        'rollout_duration_seconds',
        'skipRateLimitCheck',
        'source_uri',
        'start_time',
        'version',
      ],
    },
    paramsSchema: post_fleet_agents_bulk_upgrade_Body,
    outputSchema: z.any().describe('Response from post_fleet_agents_bulk_upgrade API'),
  },
  {
    type: 'kibana.delete_fleet_agents_files_fileid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/agents/files/:fileId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/agents/files/{fileId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_agents_files_fileid',
    parameterTypes: {
      pathParams: ['fileId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fileId: z.string().describe('Path parameter: fileId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_fleet_agents_files_fileid API'),
  },
  {
    type: 'kibana.get_fleet_agents_files_fileid_filename',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agents/files/:fileId/:fileName - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/agents/files/{fileId}/{fileName}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agents_files_fileid_filename',
    parameterTypes: {
      pathParams: ['fileId', 'fileName'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fileId: z.string().describe('Path parameter: fileId (required)'),
      fileName: z.string().describe('Path parameter: fileName (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agents_files_fileid_filename API'),
  },
  {
    type: 'kibana.get_fleet_agents_setup',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agents/setup - Kibana API endpoint',
    summary: 'Get agent setup info',
    methods: ['GET'],
    patterns: ['/api/fleet/agents/setup'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agents_setup',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agents_setup API'),
  },
  {
    type: 'kibana.post_fleet_agents_setup',
    connectorIdRequired: false,
    description: 'POST /api/fleet/agents/setup - Kibana API endpoint',
    summary: 'Initiate agent setup',
    methods: ['POST'],
    patterns: ['/api/fleet/agents/setup'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_agents_setup',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_agents_setup API'),
  },
  {
    type: 'kibana.get_fleet_agents_tags',
    connectorIdRequired: false,
    description: 'GET /api/fleet/agents/tags - Kibana API endpoint',
    summary: 'Get agent tags',
    methods: ['GET'],
    patterns: ['/api/fleet/agents/tags'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_agents_tags',
    parameterTypes: {
      pathParams: [],
      urlParams: ['kuery', 'showInactive'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      kuery: z.any().optional().describe('Query parameter: kuery'),
      showInactive: z.any().optional().describe('Query parameter: showInactive'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_agents_tags API'),
  },
  {
    type: 'kibana.get_fleet_check_permissions',
    connectorIdRequired: false,
    description: 'GET /api/fleet/check-permissions - Kibana API endpoint',
    summary: 'Check permissions',
    methods: ['GET'],
    patterns: ['/api/fleet/check-permissions'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_check_permissions',
    parameterTypes: {
      pathParams: [],
      urlParams: ['fleetServerSetup'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fleetServerSetup: z.any().optional().describe('Query parameter: fleetServerSetup'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_check_permissions API'),
  },
  {
    type: 'kibana.get_fleet_cloud_connectors',
    connectorIdRequired: false,
    description: 'GET /api/fleet/cloud_connectors - Kibana API endpoint',
    summary: 'Get cloud connectors',
    methods: ['GET'],
    patterns: ['/api/fleet/cloud_connectors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_cloud_connectors',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'perPage'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_cloud_connectors API'),
  },
  {
    type: 'kibana.post_fleet_cloud_connectors',
    connectorIdRequired: false,
    description: 'POST /api/fleet/cloud_connectors - Kibana API endpoint',
    summary: 'Create cloud connector',
    methods: ['POST'],
    patterns: ['/api/fleet/cloud_connectors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_cloud_connectors',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['cloudProvider', 'name', 'vars', 'frozen', 'type', 'value', 'id', 'isSecretRef'],
    },
    paramsSchema: post_fleet_cloud_connectors_Body,
    outputSchema: z.any().describe('Response from post_fleet_cloud_connectors API'),
  },
  {
    type: 'kibana.delete_fleet_cloud_connectors_cloudconnectorid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/cloud_connectors/:cloudConnectorId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_cloud_connectors_cloudconnectorid',
    parameterTypes: {
      pathParams: ['cloudConnectorId'],
      urlParams: ['force'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      cloudConnectorId: z.string().describe('Path parameter: cloudConnectorId (required)'),
      force: z.any().optional().describe('Query parameter: force'),
    }),
    outputSchema: z
      .any()
      .describe('Response from delete_fleet_cloud_connectors_cloudconnectorid API'),
  },
  {
    type: 'kibana.get_fleet_cloud_connectors_cloudconnectorid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/cloud_connectors/:cloudConnectorId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_cloud_connectors_cloudconnectorid',
    parameterTypes: {
      pathParams: ['cloudConnectorId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      cloudConnectorId: z.string().describe('Path parameter: cloudConnectorId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_cloud_connectors_cloudconnectorid API'),
  },
  {
    type: 'kibana.put_fleet_cloud_connectors_cloudconnectorid',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/cloud_connectors/:cloudConnectorId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/cloud_connectors/{cloudConnectorId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_cloud_connectors_cloudconnectorid',
    parameterTypes: {
      pathParams: ['cloudConnectorId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_fleet_cloud_connectors_cloudconnectorid_Body;
      const additionalFields = z.object({
        cloudConnectorId: z.string().describe('Path parameter: cloudConnectorId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_cloud_connectors_cloudconnectorid API'),
  },
  {
    type: 'kibana.get_fleet_data_streams',
    connectorIdRequired: false,
    description: 'GET /api/fleet/data_streams - Kibana API endpoint',
    summary: 'Get data streams',
    methods: ['GET'],
    patterns: ['/api/fleet/data_streams'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_data_streams',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_data_streams API'),
  },
  {
    type: 'kibana.get_fleet_enrollment_api_keys',
    connectorIdRequired: false,
    description: 'GET /api/fleet/enrollment_api_keys - Kibana API endpoint',
    summary: 'Get enrollment API keys',
    methods: ['GET'],
    patterns: ['/api/fleet/enrollment_api_keys'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_enrollment_api_keys',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'perPage', 'kuery'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      kuery: z.any().optional().describe('Query parameter: kuery'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_enrollment_api_keys API'),
  },
  {
    type: 'kibana.post_fleet_enrollment_api_keys',
    connectorIdRequired: false,
    description: 'POST /api/fleet/enrollment_api_keys - Kibana API endpoint',
    summary: 'Create an enrollment API key',
    methods: ['POST'],
    patterns: ['/api/fleet/enrollment_api_keys'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_enrollment_api_keys',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['expiration', 'name', 'policy_id'],
    },
    paramsSchema: post_fleet_enrollment_api_keys_Body,
    outputSchema: z.any().describe('Response from post_fleet_enrollment_api_keys API'),
  },
  {
    type: 'kibana.delete_fleet_enrollment_api_keys_keyid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/enrollment_api_keys/:keyId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_enrollment_api_keys_keyid',
    parameterTypes: {
      pathParams: ['keyId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      keyId: z.string().describe('Path parameter: keyId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_fleet_enrollment_api_keys_keyid API'),
  },
  {
    type: 'kibana.get_fleet_enrollment_api_keys_keyid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/enrollment_api_keys/:keyId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_enrollment_api_keys_keyid',
    parameterTypes: {
      pathParams: ['keyId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      keyId: z.string().describe('Path parameter: keyId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_enrollment_api_keys_keyid API'),
  },
  {
    type: 'kibana.post_fleet_epm_bulk_assets',
    connectorIdRequired: false,
    description: 'POST /api/fleet/epm/bulk_assets - Kibana API endpoint',
    summary: 'Bulk get assets',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/bulk_assets'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_bulk_assets',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['assetIds', 'id', 'type'],
    },
    paramsSchema: post_fleet_epm_bulk_assets_Body,
    outputSchema: z.any().describe('Response from post_fleet_epm_bulk_assets API'),
  },
  {
    type: 'kibana.get_fleet_epm_categories',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/categories - Kibana API endpoint',
    summary: 'Get package categories',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/categories'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_categories',
    parameterTypes: {
      pathParams: [],
      urlParams: ['prerelease', 'include_policy_templates'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      prerelease: z.any().optional().describe('Query parameter: prerelease'),
      include_policy_templates: z
        .any()
        .optional()
        .describe('Query parameter: include_policy_templates'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_categories API'),
  },
  {
    type: 'kibana.post_fleet_epm_custom_integrations',
    connectorIdRequired: false,
    description: 'POST /api/fleet/epm/custom_integrations - Kibana API endpoint',
    summary: 'Create a custom integration',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/custom_integrations'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_custom_integrations',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['datasets', 'name', 'type'],
    },
    paramsSchema: post_fleet_epm_custom_integrations_Body,
    outputSchema: z.any().describe('Response from post_fleet_epm_custom_integrations API'),
  },
  {
    type: 'kibana.put_fleet_epm_custom_integrations_pkgname',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/epm/custom_integrations/:pkgName - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/epm/custom_integrations/{pkgName}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_epm_custom_integrations_pkgname',
    parameterTypes: {
      pathParams: ['pkgName'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_fleet_epm_custom_integrations_pkgname_Body;
      const additionalFields = z.object({
        pkgName: z.string().describe('Path parameter: pkgName (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_epm_custom_integrations_pkgname API'),
  },
  {
    type: 'kibana.get_fleet_epm_data_streams',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/data_streams - Kibana API endpoint',
    summary: 'Get data streams',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/data_streams'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_data_streams',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_data_streams API'),
  },
  {
    type: 'kibana.get_fleet_epm_packages',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/packages - Kibana API endpoint',
    summary: 'Get packages',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/packages'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_packages',
    parameterTypes: {
      pathParams: [],
      urlParams: ['category', 'prerelease', 'excludeInstallStatus', 'withPackagePoliciesCount'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      category: z.any().optional().describe('Query parameter: category'),
      prerelease: z.any().optional().describe('Query parameter: prerelease'),
      excludeInstallStatus: z.any().optional().describe('Query parameter: excludeInstallStatus'),
      withPackagePoliciesCount: z
        .any()
        .optional()
        .describe('Query parameter: withPackagePoliciesCount'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_packages API'),
  },
  {
    type: 'kibana.post_fleet_epm_packages',
    connectorIdRequired: false,
    description: 'POST /api/fleet/epm/packages - Kibana API endpoint',
    summary: 'Install a package by upload',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_packages',
    parameterTypes: {
      pathParams: [],
      urlParams: ['ignoreMappingUpdateErrors', 'skipDataStreamRollover'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ignoreMappingUpdateErrors: z
        .any()
        .optional()
        .describe('Query parameter: ignoreMappingUpdateErrors'),
      skipDataStreamRollover: z
        .any()
        .optional()
        .describe('Query parameter: skipDataStreamRollover'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_epm_packages API'),
  },
  {
    type: 'kibana.post_fleet_epm_packages_bulk',
    connectorIdRequired: false,
    description: 'POST /api/fleet/epm/packages/_bulk - Kibana API endpoint',
    summary: 'Bulk install packages',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/_bulk'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_packages_bulk',
    parameterTypes: {
      pathParams: [],
      urlParams: ['prerelease'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_fleet_epm_packages_bulk_Body;
      const additionalFields = z.object({
        prerelease: z.any().optional().describe('Query parameter: prerelease'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_fleet_epm_packages_bulk API'),
  },
  {
    type: 'kibana.post_fleet_epm_packages_bulk_uninstall',
    connectorIdRequired: false,
    description: 'POST /api/fleet/epm/packages/_bulk_uninstall - Kibana API endpoint',
    summary: 'Bulk uninstall packages',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/_bulk_uninstall'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_packages_bulk_uninstall',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['force', 'packages', 'name', 'version'],
    },
    paramsSchema: post_fleet_epm_packages_bulk_uninstall_Body,
    outputSchema: z.any().describe('Response from post_fleet_epm_packages_bulk_uninstall API'),
  },
  {
    type: 'kibana.get_fleet_epm_packages_bulk_uninstall_taskid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/packages/_bulk_uninstall/:taskId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/packages/_bulk_uninstall/{taskId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_packages_bulk_uninstall_taskid',
    parameterTypes: {
      pathParams: ['taskId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      taskId: z.string().describe('Path parameter: taskId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z
      .any()
      .describe('Response from get_fleet_epm_packages_bulk_uninstall_taskid API'),
  },
  {
    type: 'kibana.post_fleet_epm_packages_bulk_upgrade',
    connectorIdRequired: false,
    description: 'POST /api/fleet/epm/packages/_bulk_upgrade - Kibana API endpoint',
    summary: 'Bulk upgrade packages',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/_bulk_upgrade'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_packages_bulk_upgrade',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['force', 'packages', 'name', 'version'],
    },
    paramsSchema: post_fleet_epm_packages_bulk_upgrade_Body,
    outputSchema: z.any().describe('Response from post_fleet_epm_packages_bulk_upgrade API'),
  },
  {
    type: 'kibana.get_fleet_epm_packages_bulk_upgrade_taskid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/packages/_bulk_upgrade/:taskId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/packages/_bulk_upgrade/{taskId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_packages_bulk_upgrade_taskid',
    parameterTypes: {
      pathParams: ['taskId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      taskId: z.string().describe('Path parameter: taskId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_packages_bulk_upgrade_taskid API'),
  },
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/epm/packages/:pkgName/:pkgVersion - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_epm_packages_pkgname_pkgversion',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['force'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
      force: z.any().optional().describe('Query parameter: force'),
    }),
    outputSchema: z
      .any()
      .describe('Response from delete_fleet_epm_packages_pkgname_pkgversion API'),
  },
  {
    type: 'kibana.get_fleet_epm_packages_pkgname_pkgversion',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/packages/:pkgName/:pkgVersion - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_packages_pkgname_pkgversion',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['ignoreUnverified', 'prerelease', 'full', 'withMetadata'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
      ignoreUnverified: z.any().optional().describe('Query parameter: ignoreUnverified'),
      prerelease: z.any().optional().describe('Query parameter: prerelease'),
      full: z.any().optional().describe('Query parameter: full'),
      withMetadata: z.any().optional().describe('Query parameter: withMetadata'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_packages_pkgname_pkgversion API'),
  },
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion',
    connectorIdRequired: false,
    description: 'POST /api/fleet/epm/packages/:pkgName/:pkgVersion - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_packages_pkgname_pkgversion',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['prerelease', 'ignoreMappingUpdateErrors', 'skipDataStreamRollover'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
      prerelease: z.any().optional().describe('Query parameter: prerelease'),
      ignoreMappingUpdateErrors: z
        .any()
        .optional()
        .describe('Query parameter: ignoreMappingUpdateErrors'),
      skipDataStreamRollover: z
        .any()
        .optional()
        .describe('Query parameter: skipDataStreamRollover'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_epm_packages_pkgname_pkgversion API'),
  },
  {
    type: 'kibana.put_fleet_epm_packages_pkgname_pkgversion',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/epm/packages/:pkgName/:pkgVersion - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_epm_packages_pkgname_pkgversion',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from put_fleet_epm_packages_pkgname_pkgversion API'),
  },
  {
    type: 'kibana.get_fleet_epm_packages_pkgname_pkgversion_filepath',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/packages/:pkgName/:pkgVersion/:filePath - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/{filePath}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_packages_pkgname_pkgversion_filepath',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion', 'filePath'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
      filePath: z.string().describe('Path parameter: filePath (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z
      .any()
      .describe('Response from get_fleet_epm_packages_pkgname_pkgversion_filepath API'),
  },
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets',
    connectorIdRequired: false,
    description:
      'DELETE /api/fleet/epm/packages/:pkgName/:pkgVersion/datastream_assets - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/datastream_assets'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['packagePolicyId'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
      packagePolicyId: z.any().optional().describe('Query parameter: packagePolicyId'),
    }),
    outputSchema: z
      .any()
      .describe('Response from delete_fleet_epm_packages_pkgname_pkgversion_datastream_assets API'),
  },
  {
    type: 'kibana.delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    connectorIdRequired: false,
    description:
      'DELETE /api/fleet/epm/packages/:pkgName/:pkgVersion/kibana_assets - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
    }),
    outputSchema: z
      .any()
      .describe('Response from delete_fleet_epm_packages_pkgname_pkgversion_kibana_assets API'),
  },
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    connectorIdRequired: false,
    description:
      'POST /api/fleet/epm/packages/:pkgName/:pkgVersion/kibana_assets - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_packages_pkgname_pkgversion_kibana_assets',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z
      .any()
      .describe('Response from post_fleet_epm_packages_pkgname_pkgversion_kibana_assets API'),
  },
  {
    type: 'kibana.post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize',
    connectorIdRequired: false,
    description:
      'POST /api/fleet/epm/packages/:pkgName/:pkgVersion/transforms/authorize - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/{pkgVersion}/transforms/authorize'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['prerelease'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_Body;
      const additionalFields = z.object({
        pkgName: z.string().describe('Path parameter: pkgName (required)'),
        pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
        prerelease: z.any().optional().describe('Query parameter: prerelease'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z
      .any()
      .describe(
        'Response from post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize API'
      ),
  },
  {
    type: 'kibana.get_fleet_epm_packages_pkgname_stats',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/packages/:pkgName/stats - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/packages/{pkgName}/stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_packages_pkgname_stats',
    parameterTypes: {
      pathParams: ['pkgName'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_packages_pkgname_stats API'),
  },
  {
    type: 'kibana.get_fleet_epm_packages_installed',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/packages/installed - Kibana API endpoint',
    summary: 'Get installed packages',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/packages/installed'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_packages_installed',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_packages_installed API'),
  },
  {
    type: 'kibana.get_fleet_epm_packages_limited',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/packages/limited - Kibana API endpoint',
    summary: 'Get a limited package list',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/packages/limited'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_packages_limited',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_packages_limited API'),
  },
  {
    type: 'kibana.get_fleet_epm_templates_pkgname_pkgversion_inputs',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/templates/:pkgName/:pkgVersion/inputs - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/templates/{pkgName}/{pkgVersion}/inputs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_templates_pkgname_pkgversion_inputs',
    parameterTypes: {
      pathParams: ['pkgName', 'pkgVersion'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      pkgName: z.string().describe('Path parameter: pkgName (required)'),
      pkgVersion: z.string().describe('Path parameter: pkgVersion (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z
      .any()
      .describe('Response from get_fleet_epm_templates_pkgname_pkgversion_inputs API'),
  },
  {
    type: 'kibana.get_fleet_epm_verification_key_id',
    connectorIdRequired: false,
    description: 'GET /api/fleet/epm/verification_key_id - Kibana API endpoint',
    summary: 'Get a package signature verification key ID',
    methods: ['GET'],
    patterns: ['/api/fleet/epm/verification_key_id'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_epm_verification_key_id',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_epm_verification_key_id API'),
  },
  {
    type: 'kibana.get_fleet_fleet_server_hosts',
    connectorIdRequired: false,
    description: 'GET /api/fleet/fleet_server_hosts - Kibana API endpoint',
    summary: 'Get Fleet Server hosts',
    methods: ['GET'],
    patterns: ['/api/fleet/fleet_server_hosts'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_fleet_server_hosts',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_fleet_server_hosts API'),
  },
  {
    type: 'kibana.post_fleet_fleet_server_hosts',
    connectorIdRequired: false,
    description: 'POST /api/fleet/fleet_server_hosts - Kibana API endpoint',
    summary: 'Create a Fleet Server host',
    methods: ['POST'],
    patterns: ['/api/fleet/fleet_server_hosts'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_fleet_server_hosts',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'host_urls',
        'id',
        'is_default',
        'is_internal',
        'is_preconfigured',
        'name',
        'proxy_id',
        'secrets',
        'ssl',
        'es_key',
        'id',
      ],
    },
    paramsSchema: post_fleet_fleet_server_hosts_Body,
    outputSchema: z.any().describe('Response from post_fleet_fleet_server_hosts API'),
  },
  {
    type: 'kibana.delete_fleet_fleet_server_hosts_itemid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/fleet_server_hosts/:itemId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_fleet_server_hosts_itemid',
    parameterTypes: {
      pathParams: ['itemId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      itemId: z.string().describe('Path parameter: itemId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_fleet_fleet_server_hosts_itemid API'),
  },
  {
    type: 'kibana.get_fleet_fleet_server_hosts_itemid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/fleet_server_hosts/:itemId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_fleet_server_hosts_itemid',
    parameterTypes: {
      pathParams: ['itemId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      itemId: z.string().describe('Path parameter: itemId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_fleet_server_hosts_itemid API'),
  },
  {
    type: 'kibana.put_fleet_fleet_server_hosts_itemid',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/fleet_server_hosts/:itemId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/fleet_server_hosts/{itemId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_fleet_server_hosts_itemid',
    parameterTypes: {
      pathParams: ['itemId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_fleet_fleet_server_hosts_itemid_Body;
      const additionalFields = z.object({
        itemId: z.string().describe('Path parameter: itemId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_fleet_server_hosts_itemid API'),
  },
  {
    type: 'kibana.post_fleet_health_check',
    connectorIdRequired: false,
    description: 'POST /api/fleet/health_check - Kibana API endpoint',
    summary: 'Check Fleet Server health',
    methods: ['POST'],
    patterns: ['/api/fleet/health_check'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_health_check',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_health_check API'),
  },
  {
    type: 'kibana.get_fleet_kubernetes',
    connectorIdRequired: false,
    description: 'GET /api/fleet/kubernetes - Kibana API endpoint',
    summary: 'Get a full K8s agent manifest',
    methods: ['GET'],
    patterns: ['/api/fleet/kubernetes'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_kubernetes',
    parameterTypes: {
      pathParams: [],
      urlParams: ['download', 'fleetServer', 'enrolToken'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      download: z.any().optional().describe('Query parameter: download'),
      fleetServer: z.any().optional().describe('Query parameter: fleetServer'),
      enrolToken: z.any().optional().describe('Query parameter: enrolToken'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_kubernetes API'),
  },
  {
    type: 'kibana.get_fleet_kubernetes_download',
    connectorIdRequired: false,
    description: 'GET /api/fleet/kubernetes/download - Kibana API endpoint',
    summary: 'Download an agent manifest',
    methods: ['GET'],
    patterns: ['/api/fleet/kubernetes/download'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_kubernetes_download',
    parameterTypes: {
      pathParams: [],
      urlParams: ['download', 'fleetServer', 'enrolToken'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      download: z.any().optional().describe('Query parameter: download'),
      fleetServer: z.any().optional().describe('Query parameter: fleetServer'),
      enrolToken: z.any().optional().describe('Query parameter: enrolToken'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_kubernetes_download API'),
  },
  {
    type: 'kibana.post_fleet_logstash_api_keys',
    connectorIdRequired: false,
    description: 'POST /api/fleet/logstash_api_keys - Kibana API endpoint',
    summary: 'Generate a Logstash API key',
    methods: ['POST'],
    patterns: ['/api/fleet/logstash_api_keys'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_logstash_api_keys',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_logstash_api_keys API'),
  },
  {
    type: 'kibana.post_fleet_message_signing_service_rotate_key_pair',
    connectorIdRequired: false,
    description: 'POST /api/fleet/message_signing_service/rotate_key_pair - Kibana API endpoint',
    summary: 'Rotate a Fleet message signing key pair',
    methods: ['POST'],
    patterns: ['/api/fleet/message_signing_service/rotate_key_pair'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_message_signing_service_rotate_key_pair',
    parameterTypes: {
      pathParams: [],
      urlParams: ['acknowledge'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      acknowledge: z.any().optional().describe('Query parameter: acknowledge'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z
      .any()
      .describe('Response from post_fleet_message_signing_service_rotate_key_pair API'),
  },
  {
    type: 'kibana.get_fleet_outputs',
    connectorIdRequired: false,
    description: 'GET /api/fleet/outputs - Kibana API endpoint',
    summary: 'Get outputs',
    methods: ['GET'],
    patterns: ['/api/fleet/outputs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_outputs',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_outputs API'),
  },
  {
    type: 'kibana.post_fleet_outputs',
    connectorIdRequired: false,
    description: 'POST /api/fleet/outputs - Kibana API endpoint',
    summary: 'Create output',
    methods: ['POST'],
    patterns: ['/api/fleet/outputs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_outputs',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'allow_edit',
        'ca_sha256',
        'ca_trusted_fingerprint',
        'config_yaml',
        'hosts',
        'id',
        'is_default',
        'is_default_monitoring',
        'is_internal',
        'is_preconfigured',
        'name',
        'preset',
        'proxy_id',
        'secrets',
        'ssl',
        'key',
        'hash',
        'id',
      ],
    },
    paramsSchema: post_fleet_outputs_Body,
    outputSchema: z.any().describe('Response from post_fleet_outputs API'),
  },
  {
    type: 'kibana.delete_fleet_outputs_outputid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/outputs/:outputId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/outputs/{outputId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_outputs_outputid',
    parameterTypes: {
      pathParams: ['outputId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      outputId: z.string().describe('Path parameter: outputId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_fleet_outputs_outputid API'),
  },
  {
    type: 'kibana.get_fleet_outputs_outputid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/outputs/:outputId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/outputs/{outputId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_outputs_outputid',
    parameterTypes: {
      pathParams: ['outputId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      outputId: z.string().describe('Path parameter: outputId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_outputs_outputid API'),
  },
  {
    type: 'kibana.put_fleet_outputs_outputid',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/outputs/:outputId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/outputs/{outputId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_outputs_outputid',
    parameterTypes: {
      pathParams: ['outputId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_fleet_outputs_outputid_Body;
      const additionalFields = z.object({
        outputId: z.string().describe('Path parameter: outputId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_outputs_outputid API'),
  },
  {
    type: 'kibana.get_fleet_outputs_outputid_health',
    connectorIdRequired: false,
    description: 'GET /api/fleet/outputs/:outputId/health - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/outputs/{outputId}/health'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_outputs_outputid_health',
    parameterTypes: {
      pathParams: ['outputId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      outputId: z.string().describe('Path parameter: outputId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_outputs_outputid_health API'),
  },
  {
    type: 'kibana.get_fleet_package_policies',
    connectorIdRequired: false,
    description: 'GET /api/fleet/package_policies - Kibana API endpoint',
    summary: 'Get package policies',
    methods: ['GET'],
    patterns: ['/api/fleet/package_policies'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_package_policies',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'perPage', 'sortField'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      sortField: z.any().optional().describe('Query parameter: sortField'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_package_policies API'),
  },
  {
    type: 'kibana.post_fleet_package_policies',
    connectorIdRequired: false,
    description: 'POST /api/fleet/package_policies - Kibana API endpoint',
    summary: 'Create a package policy',
    methods: ['POST'],
    patterns: ['/api/fleet/package_policies'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_package_policies',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'additional_datastreams_permissions',
        'cloud_connector_id',
        'description',
        'enabled',
        'force',
        'id',
        'inputs',
        'config',
        'frozen',
        'type',
        'value',
      ],
    },
    paramsSchema: post_fleet_package_policies_Body,
    outputSchema: z.any().describe('Response from post_fleet_package_policies API'),
  },
  {
    type: 'kibana.post_fleet_package_policies_bulk_get',
    connectorIdRequired: false,
    description: 'POST /api/fleet/package_policies/_bulk_get - Kibana API endpoint',
    summary: 'Bulk get package policies',
    methods: ['POST'],
    patterns: ['/api/fleet/package_policies/_bulk_get'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_package_policies_bulk_get',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['ids', 'ignoreMissing'],
    },
    paramsSchema: post_fleet_package_policies_bulk_get_Body,
    outputSchema: z.any().describe('Response from post_fleet_package_policies_bulk_get API'),
  },
  {
    type: 'kibana.delete_fleet_package_policies_packagepolicyid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/package_policies/:packagePolicyId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_package_policies_packagepolicyid',
    parameterTypes: {
      pathParams: ['packagePolicyId'],
      urlParams: ['force'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      packagePolicyId: z.string().describe('Path parameter: packagePolicyId (required)'),
      force: z.any().optional().describe('Query parameter: force'),
    }),
    outputSchema: z
      .any()
      .describe('Response from delete_fleet_package_policies_packagepolicyid API'),
  },
  {
    type: 'kibana.get_fleet_package_policies_packagepolicyid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/package_policies/:packagePolicyId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_package_policies_packagepolicyid',
    parameterTypes: {
      pathParams: ['packagePolicyId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      packagePolicyId: z.string().describe('Path parameter: packagePolicyId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_package_policies_packagepolicyid API'),
  },
  {
    type: 'kibana.put_fleet_package_policies_packagepolicyid',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/package_policies/:packagePolicyId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/package_policies/{packagePolicyId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_package_policies_packagepolicyid',
    parameterTypes: {
      pathParams: ['packagePolicyId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_fleet_package_policies_packagepolicyid_Body;
      const additionalFields = z.object({
        packagePolicyId: z.string().describe('Path parameter: packagePolicyId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_package_policies_packagepolicyid API'),
  },
  {
    type: 'kibana.post_fleet_package_policies_delete',
    connectorIdRequired: false,
    description: 'POST /api/fleet/package_policies/delete - Kibana API endpoint',
    summary: 'Bulk delete package policies',
    methods: ['POST'],
    patterns: ['/api/fleet/package_policies/delete'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_package_policies_delete',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['force', 'packagePolicyIds'],
    },
    paramsSchema: post_fleet_package_policies_delete_Body,
    outputSchema: z.any().describe('Response from post_fleet_package_policies_delete API'),
  },
  {
    type: 'kibana.post_fleet_package_policies_upgrade',
    connectorIdRequired: false,
    description: 'POST /api/fleet/package_policies/upgrade - Kibana API endpoint',
    summary: 'Upgrade a package policy',
    methods: ['POST'],
    patterns: ['/api/fleet/package_policies/upgrade'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_package_policies_upgrade',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['packagePolicyIds'],
    },
    paramsSchema: post_fleet_package_policies_upgrade_Body,
    outputSchema: z.any().describe('Response from post_fleet_package_policies_upgrade API'),
  },
  {
    type: 'kibana.post_fleet_package_policies_upgrade_dryrun',
    connectorIdRequired: false,
    description: 'POST /api/fleet/package_policies/upgrade/dryrun - Kibana API endpoint',
    summary: 'Dry run a package policy upgrade',
    methods: ['POST'],
    patterns: ['/api/fleet/package_policies/upgrade/dryrun'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_package_policies_upgrade_dryrun',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['packagePolicyIds', 'packageVersion'],
    },
    paramsSchema: post_fleet_package_policies_upgrade_dryrun_Body,
    outputSchema: z.any().describe('Response from post_fleet_package_policies_upgrade_dryrun API'),
  },
  {
    type: 'kibana.get_fleet_proxies',
    connectorIdRequired: false,
    description: 'GET /api/fleet/proxies - Kibana API endpoint',
    summary: 'Get proxies',
    methods: ['GET'],
    patterns: ['/api/fleet/proxies'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_proxies',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_proxies API'),
  },
  {
    type: 'kibana.post_fleet_proxies',
    connectorIdRequired: false,
    description: 'POST /api/fleet/proxies - Kibana API endpoint',
    summary: 'Create a proxy',
    methods: ['POST'],
    patterns: ['/api/fleet/proxies'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_proxies',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'certificate',
        'certificate_authorities',
        'certificate_key',
        'id',
        'is_preconfigured',
        'name',
        'proxy_headers',
        'url',
      ],
    },
    paramsSchema: post_fleet_proxies_Body,
    outputSchema: z.any().describe('Response from post_fleet_proxies API'),
  },
  {
    type: 'kibana.delete_fleet_proxies_itemid',
    connectorIdRequired: false,
    description: 'DELETE /api/fleet/proxies/:itemId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/fleet/proxies/{itemId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_fleet_proxies_itemid',
    parameterTypes: {
      pathParams: ['itemId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      itemId: z.string().describe('Path parameter: itemId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_fleet_proxies_itemid API'),
  },
  {
    type: 'kibana.get_fleet_proxies_itemid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/proxies/:itemId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/proxies/{itemId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_proxies_itemid',
    parameterTypes: {
      pathParams: ['itemId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      itemId: z.string().describe('Path parameter: itemId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_proxies_itemid API'),
  },
  {
    type: 'kibana.put_fleet_proxies_itemid',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/proxies/:itemId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/fleet/proxies/{itemId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_proxies_itemid',
    parameterTypes: {
      pathParams: ['itemId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_fleet_proxies_itemid_Body;
      const additionalFields = z.object({
        itemId: z.string().describe('Path parameter: itemId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_fleet_proxies_itemid API'),
  },
  {
    type: 'kibana.get_fleet_remote_synced_integrations_outputid_remote_status',
    connectorIdRequired: false,
    description:
      'GET /api/fleet/remote_synced_integrations/:outputId/remote_status - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/remote_synced_integrations/{outputId}/remote_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_remote_synced_integrations_outputid_remote_status',
    parameterTypes: {
      pathParams: ['outputId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      outputId: z.string().describe('Path parameter: outputId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z
      .any()
      .describe('Response from get_fleet_remote_synced_integrations_outputid_remote_status API'),
  },
  {
    type: 'kibana.get_fleet_remote_synced_integrations_status',
    connectorIdRequired: false,
    description: 'GET /api/fleet/remote_synced_integrations/status - Kibana API endpoint',
    summary: 'Get remote synced integrations status',
    methods: ['GET'],
    patterns: ['/api/fleet/remote_synced_integrations/status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_remote_synced_integrations_status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_remote_synced_integrations_status API'),
  },
  {
    type: 'kibana.post_fleet_service_tokens',
    connectorIdRequired: false,
    description: 'POST /api/fleet/service_tokens - Kibana API endpoint',
    summary: 'Create a service token',
    methods: ['POST'],
    patterns: ['/api/fleet/service_tokens'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_service_tokens',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_service_tokens API'),
  },
  {
    type: 'kibana.get_fleet_settings',
    connectorIdRequired: false,
    description: 'GET /api/fleet/settings - Kibana API endpoint',
    summary: 'Get settings',
    methods: ['GET'],
    patterns: ['/api/fleet/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_settings',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_settings API'),
  },
  {
    type: 'kibana.put_fleet_settings',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/settings - Kibana API endpoint',
    summary: 'Update settings',
    methods: ['PUT'],
    patterns: ['/api/fleet/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_settings',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'additional_yaml_config',
        'delete_unenrolled_agents',
        'enabled',
        'is_preconfigured',
      ],
    },
    paramsSchema: put_fleet_settings_Body,
    outputSchema: z.any().describe('Response from put_fleet_settings API'),
  },
  {
    type: 'kibana.post_fleet_setup',
    connectorIdRequired: false,
    description: 'POST /api/fleet/setup - Kibana API endpoint',
    summary: 'Initiate Fleet setup',
    methods: ['POST'],
    patterns: ['/api/fleet/setup'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_fleet_setup',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_fleet_setup API'),
  },
  {
    type: 'kibana.get_fleet_space_settings',
    connectorIdRequired: false,
    description: 'GET /api/fleet/space_settings - Kibana API endpoint',
    summary: 'Get space settings',
    methods: ['GET'],
    patterns: ['/api/fleet/space_settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_space_settings',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_space_settings API'),
  },
  {
    type: 'kibana.put_fleet_space_settings',
    connectorIdRequired: false,
    description: 'PUT /api/fleet/space_settings - Kibana API endpoint',
    summary: 'Create space settings',
    methods: ['PUT'],
    patterns: ['/api/fleet/space_settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_fleet_space_settings',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['allowed_namespace_prefixes'],
    },
    paramsSchema: put_fleet_space_settings_Body,
    outputSchema: z.any().describe('Response from put_fleet_space_settings API'),
  },
  {
    type: 'kibana.get_fleet_uninstall_tokens',
    connectorIdRequired: false,
    description: 'GET /api/fleet/uninstall_tokens - Kibana API endpoint',
    summary: 'Get metadata for latest uninstall tokens',
    methods: ['GET'],
    patterns: ['/api/fleet/uninstall_tokens'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_uninstall_tokens',
    parameterTypes: {
      pathParams: [],
      urlParams: ['policyId', 'search', 'perPage', 'page'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      policyId: z.any().optional().describe('Query parameter: policyId'),
      search: z.any().optional().describe('Query parameter: search'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      page: z.any().optional().describe('Query parameter: page'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_uninstall_tokens API'),
  },
  {
    type: 'kibana.get_fleet_uninstall_tokens_uninstalltokenid',
    connectorIdRequired: false,
    description: 'GET /api/fleet/uninstall_tokens/:uninstallTokenId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/fleet/uninstall_tokens/{uninstallTokenId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_fleet_uninstall_tokens_uninstalltokenid',
    parameterTypes: {
      pathParams: ['uninstallTokenId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      uninstallTokenId: z.string().describe('Path parameter: uninstallTokenId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_fleet_uninstall_tokens_uninstalltokenid API'),
  },
  {
    type: 'kibana.DeleteList',
    connectorIdRequired: false,
    description: 'DELETE /api/lists - Kibana API endpoint',
    summary: 'Delete a value list',
    methods: ['DELETE'],
    patterns: ['/api/lists'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletelist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'deleteReferences', 'ignoreReferences'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      deleteReferences: z.any().optional().describe('Query parameter: deleteReferences'),
      ignoreReferences: z.any().optional().describe('Query parameter: ignoreReferences'),
    }),
    outputSchema: z.any().describe('Response from DeleteList API'),
  },
  {
    type: 'kibana.ReadList',
    connectorIdRequired: false,
    description: 'GET /api/lists - Kibana API endpoint',
    summary: 'Get value list details',
    methods: ['GET'],
    patterns: ['/api/lists'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readlist',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
    }),
    outputSchema: z.any().describe('Response from ReadList API'),
  },
  {
    type: 'kibana.PatchList',
    connectorIdRequired: false,
    description: 'PATCH /api/lists - Kibana API endpoint',
    summary: 'Patch a value list',
    methods: ['PATCH'],
    patterns: ['/api/lists'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-patchlist',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['_version', 'description', 'id', 'meta', 'name', 'version'],
    },
    paramsSchema: PatchList_Body,
    outputSchema: z.any().describe('Response from PatchList API'),
  },
  {
    type: 'kibana.CreateList',
    connectorIdRequired: false,
    description: 'POST /api/lists - Kibana API endpoint',
    summary: 'Create a value list',
    methods: ['POST'],
    patterns: ['/api/lists'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createlist',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'description',
        'deserializer',
        'id',
        'meta',
        'name',
        'serializer',
        'type',
        'version',
      ],
    },
    paramsSchema: CreateList_Body,
    outputSchema: z.any().describe('Response from CreateList API'),
  },
  {
    type: 'kibana.UpdateList',
    connectorIdRequired: false,
    description: 'PUT /api/lists - Kibana API endpoint',
    summary: 'Update a value list',
    methods: ['PUT'],
    patterns: ['/api/lists'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatelist',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['_version', 'description', 'id', 'meta', 'name', 'version'],
    },
    paramsSchema: UpdateList_Body,
    outputSchema: z.any().describe('Response from UpdateList API'),
  },
  {
    type: 'kibana.FindLists',
    connectorIdRequired: false,
    description: 'GET /api/lists/_find - Kibana API endpoint',
    summary: 'Get value lists',
    methods: ['GET'],
    patterns: ['/api/lists/_find'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findlists',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'per_page', 'sort_field'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      per_page: z.any().optional().describe('Query parameter: per_page'),
      sort_field: z.any().optional().describe('Query parameter: sort_field'),
    }),
    outputSchema: z.any().describe('Response from FindLists API'),
  },
  {
    type: 'kibana.DeleteListIndex',
    connectorIdRequired: false,
    description: 'DELETE /api/lists/index - Kibana API endpoint',
    summary: 'Delete value list data streams',
    methods: ['DELETE'],
    patterns: ['/api/lists/index'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletelistindex',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({}),
    outputSchema: z.any().describe('Response from DeleteListIndex API'),
  },
  {
    type: 'kibana.ReadListIndex',
    connectorIdRequired: false,
    description: 'GET /api/lists/index - Kibana API endpoint',
    summary: 'Get status of value list data streams',
    methods: ['GET'],
    patterns: ['/api/lists/index'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readlistindex',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadListIndex API'),
  },
  {
    type: 'kibana.CreateListIndex',
    connectorIdRequired: false,
    description: 'POST /api/lists/index - Kibana API endpoint',
    summary: 'Create list data streams',
    methods: ['POST'],
    patterns: ['/api/lists/index'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createlistindex',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from CreateListIndex API'),
  },
  {
    type: 'kibana.DeleteListItem',
    connectorIdRequired: false,
    description: 'DELETE /api/lists/items - Kibana API endpoint',
    summary: 'Delete a value list item',
    methods: ['DELETE'],
    patterns: ['/api/lists/items'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletelistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'list_id', 'value'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      list_id: z.any().optional().describe('Query parameter: list_id'),
      value: z.any().optional().describe('Query parameter: value'),
    }),
    outputSchema: z.any().describe('Response from DeleteListItem API'),
  },
  {
    type: 'kibana.ReadListItem',
    connectorIdRequired: false,
    description: 'GET /api/lists/items - Kibana API endpoint',
    summary: 'Get a value list item',
    methods: ['GET'],
    patterns: ['/api/lists/items'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: ['id', 'list_id', 'value'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.any().optional().describe('Query parameter: id'),
      list_id: z.any().optional().describe('Query parameter: list_id'),
      value: z.any().optional().describe('Query parameter: value'),
    }),
    outputSchema: z.any().describe('Response from ReadListItem API'),
  },
  {
    type: 'kibana.PatchListItem',
    connectorIdRequired: false,
    description: 'PATCH /api/lists/items - Kibana API endpoint',
    summary: 'Patch a value list item',
    methods: ['PATCH'],
    patterns: ['/api/lists/items'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-patchlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['_version', 'id', 'meta', 'refresh', 'value'],
    },
    paramsSchema: PatchListItem_Body,
    outputSchema: z.any().describe('Response from PatchListItem API'),
  },
  {
    type: 'kibana.CreateListItem',
    connectorIdRequired: false,
    description: 'POST /api/lists/items - Kibana API endpoint',
    summary: 'Create a value list item',
    methods: ['POST'],
    patterns: ['/api/lists/items'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createlistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['id', 'list_id', 'meta', 'refresh', 'value'],
    },
    paramsSchema: CreateListItem_Body,
    outputSchema: z.any().describe('Response from CreateListItem API'),
  },
  {
    type: 'kibana.UpdateListItem',
    connectorIdRequired: false,
    description: 'PUT /api/lists/items - Kibana API endpoint',
    summary: 'Update a value list item',
    methods: ['PUT'],
    patterns: ['/api/lists/items'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatelistitem',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['_version', 'id', 'meta', 'value'],
    },
    paramsSchema: UpdateListItem_Body,
    outputSchema: z.any().describe('Response from UpdateListItem API'),
  },
  {
    type: 'kibana.ExportListItems',
    connectorIdRequired: false,
    description: 'POST /api/lists/items/_export - Kibana API endpoint',
    summary: 'Export value list items',
    methods: ['POST'],
    patterns: ['/api/lists/items/_export'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportlistitems',
    parameterTypes: {
      pathParams: [],
      urlParams: ['list_id'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      list_id: z.any().optional().describe('Query parameter: list_id'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ExportListItems API'),
  },
  {
    type: 'kibana.FindListItems',
    connectorIdRequired: false,
    description: 'GET /api/lists/items/_find - Kibana API endpoint',
    summary: 'Get value list items',
    methods: ['GET'],
    patterns: ['/api/lists/items/_find'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findlistitems',
    parameterTypes: {
      pathParams: [],
      urlParams: ['list_id', 'page', 'per_page', 'sort_field'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      list_id: z.any().optional().describe('Query parameter: list_id'),
      page: z.any().optional().describe('Query parameter: page'),
      per_page: z.any().optional().describe('Query parameter: per_page'),
      sort_field: z.any().optional().describe('Query parameter: sort_field'),
    }),
    outputSchema: z.any().describe('Response from FindListItems API'),
  },
  {
    type: 'kibana.ImportListItems',
    connectorIdRequired: false,
    description: 'POST /api/lists/items/_import - Kibana API endpoint',
    summary: 'Import value list items',
    methods: ['POST'],
    patterns: ['/api/lists/items/_import'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-importlistitems',
    parameterTypes: {
      pathParams: [],
      urlParams: ['list_id'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      list_id: z.any().optional().describe('Query parameter: list_id'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ImportListItems API'),
  },
  {
    type: 'kibana.ReadListPrivileges',
    connectorIdRequired: false,
    description: 'GET /api/lists/privileges - Kibana API endpoint',
    summary: 'Get value list privileges',
    methods: ['GET'],
    patterns: ['/api/lists/privileges'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readlistprivileges',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadListPrivileges API'),
  },
  {
    type: 'kibana.delete_logstash_pipeline',
    connectorIdRequired: false,
    description: 'DELETE /api/logstash/pipeline/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/logstash/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_logstash_pipeline',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_logstash_pipeline API'),
  },
  {
    type: 'kibana.get_logstash_pipeline',
    connectorIdRequired: false,
    description: 'GET /api/logstash/pipeline/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/logstash/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_logstash_pipeline',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_logstash_pipeline API'),
  },
  {
    type: 'kibana.put_logstash_pipeline',
    connectorIdRequired: false,
    description: 'PUT /api/logstash/pipeline/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/logstash/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_logstash_pipeline',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_logstash_pipeline_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_logstash_pipeline API'),
  },
  {
    type: 'kibana.get_logstash_pipelines',
    connectorIdRequired: false,
    description: 'GET /api/logstash/pipelines - Kibana API endpoint',
    summary: 'Get all Logstash pipelines',
    methods: ['GET'],
    patterns: ['/api/logstash/pipelines'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_logstash_pipelines',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_logstash_pipelines API'),
  },
  {
    type: 'kibana.post_maintenance_window',
    connectorIdRequired: false,
    description: 'POST /api/maintenance_window - Kibana API endpoint',
    summary: 'Create a maintenance window.',
    methods: ['POST'],
    patterns: ['/api/maintenance_window'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_maintenance_window',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'enabled',
        'schedule',
        'custom',
        'duration',
        'recurring',
        'end',
        'every',
        'occurrences',
        'onMonth',
        'onMonthDay',
        'onWeekDay',
      ],
    },
    paramsSchema: post_maintenance_window_Body,
    outputSchema: z.any().describe('Response from post_maintenance_window API'),
  },
  {
    type: 'kibana.get_maintenance_window_find',
    connectorIdRequired: false,
    description: 'GET /api/maintenance_window/_find - Kibana API endpoint',
    summary: 'Search for a maintenance window.',
    methods: ['GET'],
    patterns: ['/api/maintenance_window/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_maintenance_window_find',
    parameterTypes: {
      pathParams: [],
      urlParams: ['title', 'created_by', 'status', 'page', 'per_page'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      title: z.any().optional().describe('Query parameter: title'),
      created_by: z.any().optional().describe('Query parameter: created_by'),
      status: z.any().optional().describe('Query parameter: status'),
      page: z.any().optional().describe('Query parameter: page'),
      per_page: z.any().optional().describe('Query parameter: per_page'),
    }),
    outputSchema: z.any().describe('Response from get_maintenance_window_find API'),
  },
  {
    type: 'kibana.delete_maintenance_window_id',
    connectorIdRequired: false,
    description: 'DELETE /api/maintenance_window/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/maintenance_window/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_maintenance_window_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_maintenance_window_id API'),
  },
  {
    type: 'kibana.get_maintenance_window_id',
    connectorIdRequired: false,
    description: 'GET /api/maintenance_window/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/maintenance_window/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_maintenance_window_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_maintenance_window_id API'),
  },
  {
    type: 'kibana.patch_maintenance_window_id',
    connectorIdRequired: false,
    description: 'PATCH /api/maintenance_window/:id - Kibana API endpoint',
    methods: ['PATCH'],
    patterns: ['/api/maintenance_window/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-patch_maintenance_window_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = patch_maintenance_window_id_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from patch_maintenance_window_id API'),
  },
  {
    type: 'kibana.post_maintenance_window_id_archive',
    connectorIdRequired: false,
    description: 'POST /api/maintenance_window/:id/_archive - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/maintenance_window/{id}/_archive'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_maintenance_window_id_archive',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_maintenance_window_id_archive API'),
  },
  {
    type: 'kibana.post_maintenance_window_id_unarchive',
    connectorIdRequired: false,
    description: 'POST /api/maintenance_window/:id/_unarchive - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/maintenance_window/{id}/_unarchive'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_maintenance_window_id_unarchive',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_maintenance_window_id_unarchive API'),
  },
  {
    type: 'kibana.mlSync',
    connectorIdRequired: false,
    description: 'GET /api/ml/saved_objects/sync - Kibana API endpoint',
    summary: 'Sync saved objects in the default space',
    methods: ['GET'],
    patterns: ['/api/ml/saved_objects/sync'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-mlsync',
    parameterTypes: {
      pathParams: [],
      urlParams: ['simulate'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      simulate: z.any().optional().describe('Query parameter: simulate'),
    }),
    outputSchema: z.any().describe('Response from mlSync API'),
  },
  {
    type: 'kibana.DeleteNote',
    connectorIdRequired: false,
    description: 'DELETE /api/note - Kibana API endpoint',
    summary: 'Delete a note',
    methods: ['DELETE'],
    patterns: ['/api/note'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletenote',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({}),
    outputSchema: z.any().describe('Response from DeleteNote API'),
  },
  {
    type: 'kibana.GetNotes',
    connectorIdRequired: false,
    description: 'GET /api/note - Kibana API endpoint',
    summary: 'Get notes',
    methods: ['GET'],
    patterns: ['/api/note'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getnotes',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'documentIds',
        'savedObjectIds',
        'page',
        'perPage',
        'search',
        'sortField',
        'sortOrder',
        'filter',
        'createdByFilter',
      ],
      bodyParams: [],
    },
    paramsSchema: z.object({
      documentIds: z.any().optional().describe('Query parameter: documentIds'),
      savedObjectIds: z.any().optional().describe('Query parameter: savedObjectIds'),
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
      search: z.any().optional().describe('Query parameter: search'),
      sortField: z.any().optional().describe('Query parameter: sortField'),
      sortOrder: z.any().optional().describe('Query parameter: sortOrder'),
      filter: z.any().optional().describe('Query parameter: filter'),
      createdByFilter: z.any().optional().describe('Query parameter: createdByFilter'),
    }),
    outputSchema: z.any().describe('Response from GetNotes API'),
  },
  {
    type: 'kibana.PersistNoteRoute',
    connectorIdRequired: false,
    description: 'PATCH /api/note - Kibana API endpoint',
    summary: 'Add or update a note',
    methods: ['PATCH'],
    patterns: ['/api/note'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-persistnoteroute',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['note', 'noteId', 'version'],
    },
    paramsSchema: PersistNoteRoute_Body,
    outputSchema: z.any().describe('Response from PersistNoteRoute API'),
  },
  {
    type: 'kibana.observability_ai_assistant_chat_complete',
    connectorIdRequired: false,
    description: 'POST /api/observability_ai_assistant/chat/complete - Kibana API endpoint',
    summary: 'Generate a chat completion',
    methods: ['POST'],
    patterns: ['/api/observability_ai_assistant/chat/complete'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-observability_ai_assistant_chat_complete',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'actions',
        'connectorId',
        'conversationId',
        'disableFunctions',
        'instructions',
        'messages',
        'persist',
        'title',
      ],
    },
    paramsSchema: observability_ai_assistant_chat_complete_Body,
    outputSchema: z.any().describe('Response from observability_ai_assistant_chat_complete API'),
  },
  {
    type: 'kibana.OsqueryFindLiveQueries',
    connectorIdRequired: false,
    description: 'GET /api/osquery/live_queries - Kibana API endpoint',
    summary: 'Get live queries',
    methods: ['GET'],
    patterns: ['/api/osquery/live_queries'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osqueryfindlivequeries',
    parameterTypes: {
      pathParams: [],
      urlParams: ['kuery', 'page', 'pageSize', 'sort'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      kuery: z.any().optional().describe('Query parameter: kuery'),
      page: z.any().optional().describe('Query parameter: page'),
      pageSize: z.any().optional().describe('Query parameter: pageSize'),
      sort: z.any().optional().describe('Query parameter: sort'),
    }),
    outputSchema: z.any().describe('Response from OsqueryFindLiveQueries API'),
  },
  {
    type: 'kibana.OsqueryCreateLiveQuery',
    connectorIdRequired: false,
    description: 'POST /api/osquery/live_queries - Kibana API endpoint',
    summary: 'Create a live query',
    methods: ['POST'],
    patterns: ['/api/osquery/live_queries'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerycreatelivequery',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'agent_all',
        'agent_ids',
        'agent_platforms',
        'agent_policy_ids',
        'alert_ids',
        'case_ids',
        'ecs_mapping',
        'event_ids',
        'metadata',
      ],
    },
    paramsSchema: Security_Osquery_API_CreateLiveQueryRequestBody,
    outputSchema: z.any().describe('Response from OsqueryCreateLiveQuery API'),
  },
  {
    type: 'kibana.OsqueryGetLiveQueryDetails',
    connectorIdRequired: false,
    description: 'GET /api/osquery/live_queries/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/osquery/live_queries/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerygetlivequerydetails',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from OsqueryGetLiveQueryDetails API'),
  },
  {
    type: 'kibana.OsqueryGetLiveQueryResults',
    connectorIdRequired: false,
    description: 'GET /api/osquery/live_queries/:id/results/:actionId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/osquery/live_queries/{id}/results/{actionId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerygetlivequeryresults',
    parameterTypes: {
      pathParams: ['id', 'actionId'],
      urlParams: ['kuery', 'page', 'pageSize', 'sort'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      actionId: z.string().describe('Path parameter: actionId (required)'),
      kuery: z.any().optional().describe('Query parameter: kuery'),
      page: z.any().optional().describe('Query parameter: page'),
      pageSize: z.any().optional().describe('Query parameter: pageSize'),
      sort: z.any().optional().describe('Query parameter: sort'),
    }),
    outputSchema: z.any().describe('Response from OsqueryGetLiveQueryResults API'),
  },
  {
    type: 'kibana.OsqueryFindPacks',
    connectorIdRequired: false,
    description: 'GET /api/osquery/packs - Kibana API endpoint',
    summary: 'Get packs',
    methods: ['GET'],
    patterns: ['/api/osquery/packs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osqueryfindpacks',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'pageSize', 'sort'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      pageSize: z.any().optional().describe('Query parameter: pageSize'),
      sort: z.any().optional().describe('Query parameter: sort'),
    }),
    outputSchema: z.any().describe('Response from OsqueryFindPacks API'),
  },
  {
    type: 'kibana.OsqueryCreatePacks',
    connectorIdRequired: false,
    description: 'POST /api/osquery/packs - Kibana API endpoint',
    summary: 'Create a pack',
    methods: ['POST'],
    patterns: ['/api/osquery/packs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerycreatepacks',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['description', 'enabled', 'name', 'policy_ids', 'queries', 'shards'],
    },
    paramsSchema: Security_Osquery_API_CreatePacksRequestBody,
    outputSchema: z.any().describe('Response from OsqueryCreatePacks API'),
  },
  {
    type: 'kibana.OsqueryDeletePacks',
    connectorIdRequired: false,
    description: 'DELETE /api/osquery/packs/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/osquery/packs/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerydeletepacks',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from OsqueryDeletePacks API'),
  },
  {
    type: 'kibana.OsqueryGetPacksDetails',
    connectorIdRequired: false,
    description: 'GET /api/osquery/packs/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/osquery/packs/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerygetpacksdetails',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from OsqueryGetPacksDetails API'),
  },
  {
    type: 'kibana.OsqueryUpdatePacks',
    connectorIdRequired: false,
    description: 'PUT /api/osquery/packs/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/osquery/packs/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osqueryupdatepacks',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Security_Osquery_API_UpdatePacksRequestBody;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from OsqueryUpdatePacks API'),
  },
  {
    type: 'kibana.OsqueryFindSavedQueries',
    connectorIdRequired: false,
    description: 'GET /api/osquery/saved_queries - Kibana API endpoint',
    summary: 'Get saved queries',
    methods: ['GET'],
    patterns: ['/api/osquery/saved_queries'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osqueryfindsavedqueries',
    parameterTypes: {
      pathParams: [],
      urlParams: ['page', 'pageSize', 'sort'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      page: z.any().optional().describe('Query parameter: page'),
      pageSize: z.any().optional().describe('Query parameter: pageSize'),
      sort: z.any().optional().describe('Query parameter: sort'),
    }),
    outputSchema: z.any().describe('Response from OsqueryFindSavedQueries API'),
  },
  {
    type: 'kibana.OsqueryCreateSavedQuery',
    connectorIdRequired: false,
    description: 'POST /api/osquery/saved_queries - Kibana API endpoint',
    summary: 'Create a saved query',
    methods: ['POST'],
    patterns: ['/api/osquery/saved_queries'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerycreatesavedquery',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'description',
        'ecs_mapping',
        'id',
        'interval',
        'platform',
        'query',
        'removed',
        'snapshot',
        'version',
      ],
    },
    paramsSchema: Security_Osquery_API_CreateSavedQueryRequestBody,
    outputSchema: z.any().describe('Response from OsqueryCreateSavedQuery API'),
  },
  {
    type: 'kibana.OsqueryDeleteSavedQuery',
    connectorIdRequired: false,
    description: 'DELETE /api/osquery/saved_queries/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/osquery/saved_queries/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerydeletesavedquery',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from OsqueryDeleteSavedQuery API'),
  },
  {
    type: 'kibana.OsqueryGetSavedQueryDetails',
    connectorIdRequired: false,
    description: 'GET /api/osquery/saved_queries/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/osquery/saved_queries/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerygetsavedquerydetails',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from OsqueryGetSavedQueryDetails API'),
  },
  {
    type: 'kibana.OsqueryUpdateSavedQuery',
    connectorIdRequired: false,
    description: 'PUT /api/osquery/saved_queries/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/osquery/saved_queries/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osqueryupdatesavedquery',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Security_Osquery_API_UpdateSavedQueryRequestBody;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from OsqueryUpdateSavedQuery API'),
  },
  {
    type: 'kibana.PersistPinnedEventRoute',
    connectorIdRequired: false,
    description: 'PATCH /api/pinned_event - Kibana API endpoint',
    summary: 'Pin/unpin an event',
    methods: ['PATCH'],
    patterns: ['/api/pinned_event'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-persistpinnedeventroute',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['eventId', 'pinnedEventId', 'timelineId'],
    },
    paramsSchema: PersistPinnedEventRoute_Body,
    outputSchema: z.any().describe('Response from PersistPinnedEventRoute API'),
  },
  {
    type: 'kibana.CleanUpRiskEngine',
    connectorIdRequired: false,
    description: 'DELETE /api/risk_score/engine/dangerously_delete_data - Kibana API endpoint',
    summary: 'Cleanup the Risk Engine',
    methods: ['DELETE'],
    patterns: ['/api/risk_score/engine/dangerously_delete_data'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-cleanupriskengine',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({}),
    outputSchema: z.any().describe('Response from CleanUpRiskEngine API'),
  },
  {
    type: 'kibana.ConfigureRiskEngineSavedObject',
    connectorIdRequired: false,
    description: 'PATCH /api/risk_score/engine/saved_object/configure - Kibana API endpoint',
    summary: 'Configure the Risk Engine Saved Object',
    methods: ['PATCH'],
    patterns: ['/api/risk_score/engine/saved_object/configure'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-configureriskenginesavedobject',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['exclude_alert_statuses', 'exclude_alert_tags', 'range', 'end', 'start'],
    },
    paramsSchema: ConfigureRiskEngineSavedObject_Body,
    outputSchema: z.any().describe('Response from ConfigureRiskEngineSavedObject API'),
  },
  {
    type: 'kibana.ScheduleRiskEngineNow',
    connectorIdRequired: false,
    description: 'POST /api/risk_score/engine/schedule_now - Kibana API endpoint',
    summary: 'Run the risk scoring engine',
    methods: ['POST'],
    patterns: ['/api/risk_score/engine/schedule_now'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-scheduleriskenginenow',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ScheduleRiskEngineNow API'),
  },
  {
    type: 'kibana.post_saved_objects_export',
    connectorIdRequired: false,
    description: 'POST /api/saved_objects/_export - Kibana API endpoint',
    summary: 'Export saved objects',
    methods: ['POST'],
    patterns: ['/api/saved_objects/_export'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_saved_objects_export',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['excludeExportDetails', 'hasReference', 'id', 'type'],
    },
    paramsSchema: post_saved_objects_export_Body,
    outputSchema: z.any().describe('Response from post_saved_objects_export API'),
  },
  {
    type: 'kibana.post_saved_objects_import',
    connectorIdRequired: false,
    description: 'POST /api/saved_objects/_import - Kibana API endpoint',
    summary: 'Import saved objects',
    methods: ['POST'],
    patterns: ['/api/saved_objects/_import'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_saved_objects_import',
    parameterTypes: {
      pathParams: [],
      urlParams: ['overwrite', 'createNewCopies', 'compatibilityMode'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      overwrite: z.any().optional().describe('Query parameter: overwrite'),
      createNewCopies: z.any().optional().describe('Query parameter: createNewCopies'),
      compatibilityMode: z.any().optional().describe('Query parameter: compatibilityMode'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_saved_objects_import API'),
  },
  {
    type: 'kibana.resolveImportErrors',
    connectorIdRequired: false,
    description: 'POST /api/saved_objects/_resolve_import_errors - Kibana API endpoint',
    summary: 'Resolve import errors',
    methods: ['POST'],
    patterns: ['/api/saved_objects/_resolve_import_errors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-resolveimporterrors',
    parameterTypes: {
      pathParams: [],
      urlParams: ['compatibilityMode', 'createNewCopies'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = resolveImportErrors_Body;
      const additionalFields = z.object({
        compatibilityMode: z.any().optional().describe('Query parameter: compatibilityMode'),
        createNewCopies: z.any().optional().describe('Query parameter: createNewCopies'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from resolveImportErrors API'),
  },
  {
    type: 'kibana.PerformAnonymizationFieldsBulkAction',
    connectorIdRequired: false,
    description:
      'POST /api/security_ai_assistant/anonymization_fields/_bulk_action - Kibana API endpoint',
    summary: 'Apply a bulk action to anonymization fields',
    methods: ['POST'],
    patterns: ['/api/security_ai_assistant/anonymization_fields/_bulk_action'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-performanonymizationfieldsbulkaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['create', 'delete', 'ids', 'query'],
    },
    paramsSchema: PerformAnonymizationFieldsBulkAction_Body,
    outputSchema: z.any().describe('Response from PerformAnonymizationFieldsBulkAction API'),
  },
  {
    type: 'kibana.FindAnonymizationFields',
    connectorIdRequired: false,
    description: 'GET /api/security_ai_assistant/anonymization_fields/_find - Kibana API endpoint',
    summary: 'Get anonymization fields',
    methods: ['GET'],
    patterns: ['/api/security_ai_assistant/anonymization_fields/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findanonymizationfields',
    parameterTypes: {
      pathParams: [],
      urlParams: ['fields', 'filter'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fields: z.any().optional().describe('Query parameter: fields'),
      filter: z.any().optional().describe('Query parameter: filter'),
    }),
    outputSchema: z.any().describe('Response from FindAnonymizationFields API'),
  },
  {
    type: 'kibana.ChatComplete',
    connectorIdRequired: false,
    description: 'POST /api/security_ai_assistant/chat/complete - Kibana API endpoint',
    summary: 'Create a model response',
    methods: ['POST'],
    patterns: ['/api/security_ai_assistant/chat/complete'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-chatcomplete',
    parameterTypes: {
      pathParams: [],
      urlParams: ['content_references_disabled'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Security_AI_Assistant_API_ChatCompleteProps;
      const additionalFields = z.object({
        content_references_disabled: z
          .any()
          .optional()
          .describe('Query parameter: content_references_disabled'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from ChatComplete API'),
  },
  {
    type: 'kibana.DeleteAllConversations',
    connectorIdRequired: false,
    description:
      'DELETE /api/security_ai_assistant/current_user/conversations - Kibana API endpoint',
    summary: 'Delete conversations',
    methods: ['DELETE'],
    patterns: ['/api/security_ai_assistant/current_user/conversations'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteallconversations',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({}),
    outputSchema: z.any().describe('Response from DeleteAllConversations API'),
  },
  {
    type: 'kibana.CreateConversation',
    connectorIdRequired: false,
    description: 'POST /api/security_ai_assistant/current_user/conversations - Kibana API endpoint',
    summary: 'Create a conversation',
    methods: ['POST'],
    patterns: ['/api/security_ai_assistant/current_user/conversations'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createconversation',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'apiConfig',
        'category',
        'excludeFromLastConversationStorage',
        'id',
        'messages',
        'replacements',
        'title',
      ],
    },
    paramsSchema: Security_AI_Assistant_API_ConversationCreateProps,
    outputSchema: z.any().describe('Response from CreateConversation API'),
  },
  {
    type: 'kibana.FindConversations',
    connectorIdRequired: false,
    description:
      'GET /api/security_ai_assistant/current_user/conversations/_find - Kibana API endpoint',
    summary: 'Get conversations',
    methods: ['GET'],
    patterns: ['/api/security_ai_assistant/current_user/conversations/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findconversations',
    parameterTypes: {
      pathParams: [],
      urlParams: ['fields', 'filter'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fields: z.any().optional().describe('Query parameter: fields'),
      filter: z.any().optional().describe('Query parameter: filter'),
    }),
    outputSchema: z.any().describe('Response from FindConversations API'),
  },
  {
    type: 'kibana.DeleteConversation',
    connectorIdRequired: false,
    description:
      'DELETE /api/security_ai_assistant/current_user/conversations/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteconversation',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from DeleteConversation API'),
  },
  {
    type: 'kibana.ReadConversation',
    connectorIdRequired: false,
    description:
      'GET /api/security_ai_assistant/current_user/conversations/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readconversation',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadConversation API'),
  },
  {
    type: 'kibana.UpdateConversation',
    connectorIdRequired: false,
    description:
      'PUT /api/security_ai_assistant/current_user/conversations/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateconversation',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Security_AI_Assistant_API_ConversationUpdateProps;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from UpdateConversation API'),
  },
  {
    type: 'kibana.ReadKnowledgeBase',
    connectorIdRequired: false,
    description: 'GET /api/security_ai_assistant/knowledge_base/:resource - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readknowledgebase',
    parameterTypes: {
      pathParams: ['resource'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      resource: z.string().describe('Path parameter: resource (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadKnowledgeBase API'),
  },
  {
    type: 'kibana.CreateKnowledgeBase',
    connectorIdRequired: false,
    description: 'POST /api/security_ai_assistant/knowledge_base/:resource - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createknowledgebase',
    parameterTypes: {
      pathParams: ['resource'],
      urlParams: ['modelId', 'ignoreSecurityLabs'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      resource: z.string().describe('Path parameter: resource (required)'),
      modelId: z.any().optional().describe('Query parameter: modelId'),
      ignoreSecurityLabs: z.any().optional().describe('Query parameter: ignoreSecurityLabs'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from CreateKnowledgeBase API'),
  },
  {
    type: 'kibana.CreateKnowledgeBaseEntry',
    connectorIdRequired: false,
    description: 'POST /api/security_ai_assistant/knowledge_base/entries - Kibana API endpoint',
    summary: 'Create a Knowledge Base Entry',
    methods: ['POST'],
    patterns: ['/api/security_ai_assistant/knowledge_base/entries'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createknowledgebaseentry',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: Security_AI_Assistant_API_KnowledgeBaseEntryCreateProps,
    outputSchema: z.any().describe('Response from CreateKnowledgeBaseEntry API'),
  },
  {
    type: 'kibana.PerformKnowledgeBaseEntryBulkAction',
    connectorIdRequired: false,
    description:
      'POST /api/security_ai_assistant/knowledge_base/entries/_bulk_action - Kibana API endpoint',
    summary: 'Applies a bulk action to multiple Knowledge Base Entries',
    methods: ['POST'],
    patterns: ['/api/security_ai_assistant/knowledge_base/entries/_bulk_action'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-performknowledgebaseentrybulkaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['create', 'delete', 'ids', 'query'],
    },
    paramsSchema: PerformKnowledgeBaseEntryBulkAction_Body,
    outputSchema: z.any().describe('Response from PerformKnowledgeBaseEntryBulkAction API'),
  },
  {
    type: 'kibana.FindKnowledgeBaseEntries',
    connectorIdRequired: false,
    description:
      'GET /api/security_ai_assistant/knowledge_base/entries/_find - Kibana API endpoint',
    summary: 'Finds Knowledge Base Entries that match the given query.',
    methods: ['GET'],
    patterns: ['/api/security_ai_assistant/knowledge_base/entries/_find'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findknowledgebaseentries',
    parameterTypes: {
      pathParams: [],
      urlParams: ['fields', 'filter'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fields: z.any().optional().describe('Query parameter: fields'),
      filter: z.any().optional().describe('Query parameter: filter'),
    }),
    outputSchema: z.any().describe('Response from FindKnowledgeBaseEntries API'),
  },
  {
    type: 'kibana.DeleteKnowledgeBaseEntry',
    connectorIdRequired: false,
    description:
      'DELETE /api/security_ai_assistant/knowledge_base/entries/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteknowledgebaseentry',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from DeleteKnowledgeBaseEntry API'),
  },
  {
    type: 'kibana.ReadKnowledgeBaseEntry',
    connectorIdRequired: false,
    description: 'GET /api/security_ai_assistant/knowledge_base/entries/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readknowledgebaseentry',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from ReadKnowledgeBaseEntry API'),
  },
  {
    type: 'kibana.UpdateKnowledgeBaseEntry',
    connectorIdRequired: false,
    description: 'PUT /api/security_ai_assistant/knowledge_base/entries/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateknowledgebaseentry',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = Security_AI_Assistant_API_KnowledgeBaseEntryUpdateRouteProps;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from UpdateKnowledgeBaseEntry API'),
  },
  {
    type: 'kibana.PerformPromptsBulkAction',
    connectorIdRequired: false,
    description: 'POST /api/security_ai_assistant/prompts/_bulk_action - Kibana API endpoint',
    summary: 'Apply a bulk action to prompts',
    methods: ['POST'],
    patterns: ['/api/security_ai_assistant/prompts/_bulk_action'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-performpromptsbulkaction',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['create', 'delete', 'ids', 'query'],
    },
    paramsSchema: PerformPromptsBulkAction_Body,
    outputSchema: z.any().describe('Response from PerformPromptsBulkAction API'),
  },
  {
    type: 'kibana.FindPrompts',
    connectorIdRequired: false,
    description: 'GET /api/security_ai_assistant/prompts/_find - Kibana API endpoint',
    summary: 'Get prompts',
    methods: ['GET'],
    patterns: ['/api/security_ai_assistant/prompts/_find'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findprompts',
    parameterTypes: {
      pathParams: [],
      urlParams: ['fields', 'filter'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      fields: z.any().optional().describe('Query parameter: fields'),
      filter: z.any().optional().describe('Query parameter: filter'),
    }),
    outputSchema: z.any().describe('Response from FindPrompts API'),
  },
  {
    type: 'kibana.get_security_role',
    connectorIdRequired: false,
    description: 'GET /api/security/role - Kibana API endpoint',
    summary: 'Get all roles',
    methods: ['GET'],
    patterns: ['/api/security/role'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_security_role',
    parameterTypes: {
      pathParams: [],
      urlParams: ['replaceDeprecatedPrivileges'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      replaceDeprecatedPrivileges: z
        .any()
        .optional()
        .describe('Query parameter: replaceDeprecatedPrivileges'),
    }),
    outputSchema: z.any().describe('Response from get_security_role API'),
  },
  {
    type: 'kibana.post_security_role_query',
    connectorIdRequired: false,
    description: 'POST /api/security/role/_query - Kibana API endpoint',
    summary: 'Query roles',
    methods: ['POST'],
    patterns: ['/api/security/role/_query'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_security_role_query',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['filters', 'showReservedRoles'],
    },
    paramsSchema: post_security_role_query_Body,
    outputSchema: z.any().describe('Response from post_security_role_query API'),
  },
  {
    type: 'kibana.delete_security_role_name',
    connectorIdRequired: false,
    description: 'DELETE /api/security/role/:name - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/security/role/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_security_role_name',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_security_role_name API'),
  },
  {
    type: 'kibana.get_security_role_name',
    connectorIdRequired: false,
    description: 'GET /api/security/role/:name - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/security/role/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_security_role_name',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['replaceDeprecatedPrivileges'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      replaceDeprecatedPrivileges: z
        .any()
        .optional()
        .describe('Query parameter: replaceDeprecatedPrivileges'),
    }),
    outputSchema: z.any().describe('Response from get_security_role_name API'),
  },
  {
    type: 'kibana.put_security_role_name',
    connectorIdRequired: false,
    description: 'PUT /api/security/role/:name - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/security/role/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_security_role_name',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['createOnly'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_security_role_name_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
        createOnly: z.any().optional().describe('Query parameter: createOnly'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_security_role_name API'),
  },
  {
    type: 'kibana.post_security_roles',
    connectorIdRequired: false,
    description: 'POST /api/security/roles - Kibana API endpoint',
    summary: 'Create or update roles',
    methods: ['POST'],
    patterns: ['/api/security/roles'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_security_roles',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'roles',
        'description',
        'elasticsearch',
        'cluster',
        'indices',
        'allow_restricted_indices',
        'field_security',
        'names',
        'privileges',
        'query',
      ],
    },
    paramsSchema: post_security_roles_Body,
    outputSchema: z.any().describe('Response from post_security_roles API'),
  },
  {
    type: 'kibana.post_security_session_invalidate',
    connectorIdRequired: false,
    description: 'POST /api/security/session/_invalidate - Kibana API endpoint',
    summary: 'Invalidate user sessions',
    methods: ['POST'],
    patterns: ['/api/security/session/_invalidate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_security_session_invalidate',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['match', 'query', 'provider', 'name', 'type'],
    },
    paramsSchema: post_security_session_invalidate_Body,
    outputSchema: z.any().describe('Response from post_security_session_invalidate API'),
  },
  {
    type: 'kibana.post_url',
    connectorIdRequired: false,
    description: 'POST /api/short_url - Kibana API endpoint',
    summary: 'Create a short URL',
    methods: ['POST'],
    patterns: ['/api/short_url'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_url',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['humanReadableSlug', 'locatorId', 'params'],
    },
    paramsSchema: post_url_Body,
    outputSchema: z.any().describe('Response from post_url API'),
  },
  {
    type: 'kibana.resolve_url',
    connectorIdRequired: false,
    description: 'GET /api/short_url/_slug/:slug - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/short_url/_slug/{slug}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-resolve_url',
    parameterTypes: {
      pathParams: ['slug'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      slug: z.string().describe('Path parameter: slug (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from resolve_url API'),
  },
  {
    type: 'kibana.delete_url',
    connectorIdRequired: false,
    description: 'DELETE /api/short_url/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/short_url/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_url',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_url API'),
  },
  {
    type: 'kibana.get_url',
    connectorIdRequired: false,
    description: 'GET /api/short_url/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/short_url/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_url',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_url API'),
  },
  {
    type: 'kibana.post_spaces_copy_saved_objects',
    connectorIdRequired: false,
    description: 'POST /api/spaces/_copy_saved_objects - Kibana API endpoint',
    summary: 'Copy saved objects between spaces',
    methods: ['POST'],
    patterns: ['/api/spaces/_copy_saved_objects'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_spaces_copy_saved_objects',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'compatibilityMode',
        'createNewCopies',
        'includeReferences',
        'objects',
        'id',
        'type',
      ],
    },
    paramsSchema: post_spaces_copy_saved_objects_Body,
    outputSchema: z.any().describe('Response from post_spaces_copy_saved_objects API'),
  },
  {
    type: 'kibana.post_spaces_disable_legacy_url_aliases',
    connectorIdRequired: false,
    description: 'POST /api/spaces/_disable_legacy_url_aliases - Kibana API endpoint',
    summary: 'Disable legacy URL aliases',
    methods: ['POST'],
    patterns: ['/api/spaces/_disable_legacy_url_aliases'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_spaces_disable_legacy_url_aliases',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['aliases', 'sourceId', 'targetSpace', 'targetType'],
    },
    paramsSchema: post_spaces_disable_legacy_url_aliases_Body,
    outputSchema: z.any().describe('Response from post_spaces_disable_legacy_url_aliases API'),
  },
  {
    type: 'kibana.post_spaces_get_shareable_references',
    connectorIdRequired: false,
    description: 'POST /api/spaces/_get_shareable_references - Kibana API endpoint',
    summary: 'Get shareable references',
    methods: ['POST'],
    patterns: ['/api/spaces/_get_shareable_references'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_spaces_get_shareable_references',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['objects', 'id', 'type'],
    },
    paramsSchema: post_spaces_get_shareable_references_Body,
    outputSchema: z.any().describe('Response from post_spaces_get_shareable_references API'),
  },
  {
    type: 'kibana.post_spaces_resolve_copy_saved_objects_errors',
    connectorIdRequired: false,
    description: 'POST /api/spaces/_resolve_copy_saved_objects_errors - Kibana API endpoint',
    summary: 'Resolve conflicts copying saved objects',
    methods: ['POST'],
    patterns: ['/api/spaces/_resolve_copy_saved_objects_errors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_spaces_resolve_copy_saved_objects_errors',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'compatibilityMode',
        'createNewCopies',
        'includeReferences',
        'objects',
        'id',
        'type',
      ],
    },
    paramsSchema: post_spaces_resolve_copy_saved_objects_errors_Body,
    outputSchema: z
      .any()
      .describe('Response from post_spaces_resolve_copy_saved_objects_errors API'),
  },
  {
    type: 'kibana.post_spaces_update_objects_spaces',
    connectorIdRequired: false,
    description: 'POST /api/spaces/_update_objects_spaces - Kibana API endpoint',
    summary: 'Update saved objects in spaces',
    methods: ['POST'],
    patterns: ['/api/spaces/_update_objects_spaces'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_spaces_update_objects_spaces',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['objects', 'id', 'type'],
    },
    paramsSchema: post_spaces_update_objects_spaces_Body,
    outputSchema: z.any().describe('Response from post_spaces_update_objects_spaces API'),
  },
  {
    type: 'kibana.get_spaces_space',
    connectorIdRequired: false,
    description: 'GET /api/spaces/space - Kibana API endpoint',
    summary: 'Get all spaces',
    methods: ['GET'],
    patterns: ['/api/spaces/space'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_spaces_space',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_spaces_space API'),
  },
  {
    type: 'kibana.post_spaces_space',
    connectorIdRequired: false,
    description: 'POST /api/spaces/space - Kibana API endpoint',
    summary: 'Create a space',
    methods: ['POST'],
    patterns: ['/api/spaces/space'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_spaces_space',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        '_reserved',
        'color',
        'description',
        'disabledFeatures',
        'id',
        'imageUrl',
        'initials',
        'name',
        'solution',
      ],
    },
    paramsSchema: post_spaces_space_Body,
    outputSchema: z.any().describe('Response from post_spaces_space API'),
  },
  {
    type: 'kibana.delete_spaces_space_id',
    connectorIdRequired: false,
    description: 'DELETE /api/spaces/space/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/spaces/space/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_spaces_space_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_spaces_space_id API'),
  },
  {
    type: 'kibana.get_spaces_space_id',
    connectorIdRequired: false,
    description: 'GET /api/spaces/space/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/spaces/space/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_spaces_space_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_spaces_space_id API'),
  },
  {
    type: 'kibana.put_spaces_space_id',
    connectorIdRequired: false,
    description: 'PUT /api/spaces/space/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/spaces/space/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_spaces_space_id',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_spaces_space_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_spaces_space_id API'),
  },
  {
    type: 'kibana.get_status',
    connectorIdRequired: false,
    description: 'GET /api/status - Kibana API endpoint',
    summary: "Get Kibana's current status",
    methods: ['GET'],
    patterns: ['/api/status'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['v7format', 'v8format'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      v7format: z.any().optional().describe('Query parameter: v7format'),
      v8format: z.any().optional().describe('Query parameter: v8format'),
    }),
    outputSchema: z.any().describe('Response from get_status API'),
  },
  {
    type: 'kibana.get_streams',
    connectorIdRequired: false,
    description: 'GET /api/streams - Kibana API endpoint',
    summary: 'Get stream list',
    methods: ['GET'],
    patterns: ['/api/streams'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_streams',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_streams API'),
  },
  {
    type: 'kibana.post_streams_disable',
    connectorIdRequired: false,
    description: 'POST /api/streams/_disable - Kibana API endpoint',
    summary: 'Disable streams',
    methods: ['POST'],
    patterns: ['/api/streams/_disable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_disable',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: get_streams_Body,
    outputSchema: z.any().describe('Response from post_streams_disable API'),
  },
  {
    type: 'kibana.post_streams_enable',
    connectorIdRequired: false,
    description: 'POST /api/streams/_enable - Kibana API endpoint',
    summary: 'Enable streams',
    methods: ['POST'],
    patterns: ['/api/streams/_enable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_enable',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: get_streams_Body,
    outputSchema: z.any().describe('Response from post_streams_enable API'),
  },
  {
    type: 'kibana.post_streams_resync',
    connectorIdRequired: false,
    description: 'POST /api/streams/_resync - Kibana API endpoint',
    summary: 'Resync streams',
    methods: ['POST'],
    patterns: ['/api/streams/_resync'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_resync',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: get_streams_Body,
    outputSchema: z.any().describe('Response from post_streams_resync API'),
  },
  {
    type: 'kibana.delete_streams_name',
    connectorIdRequired: false,
    description: 'DELETE /api/streams/:name - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/streams/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_streams_name',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_streams_name API'),
  },
  {
    type: 'kibana.get_streams_name',
    connectorIdRequired: false,
    description: 'GET /api/streams/:name - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/streams/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_streams_name',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_streams_name API'),
  },
  {
    type: 'kibana.put_streams_name',
    connectorIdRequired: false,
    description: 'PUT /api/streams/:name - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/streams/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_streams_name',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_streams_name_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_streams_name API'),
  },
  {
    type: 'kibana.post_streams_name_fork',
    connectorIdRequired: false,
    description: 'POST /api/streams/:name/_fork - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/streams/{name}/_fork'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_name_fork',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_streams_name_fork_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_streams_name_fork API'),
  },
  {
    type: 'kibana.get_streams_name_group',
    connectorIdRequired: false,
    description: 'GET /api/streams/:name/_group - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/streams/{name}/_group'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_streams_name_group',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_streams_name_group API'),
  },
  {
    type: 'kibana.put_streams_name_group',
    connectorIdRequired: false,
    description: 'PUT /api/streams/:name/_group - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/streams/{name}/_group'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_streams_name_group',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_streams_name_group_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_streams_name_group API'),
  },
  {
    type: 'kibana.get_streams_name_ingest',
    connectorIdRequired: false,
    description: 'GET /api/streams/:name/_ingest - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/streams/{name}/_ingest'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_streams_name_ingest',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_streams_name_ingest API'),
  },
  {
    type: 'kibana.put_streams_name_ingest',
    connectorIdRequired: false,
    description: 'PUT /api/streams/:name/_ingest - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/streams/{name}/_ingest'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_streams_name_ingest',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_streams_name_ingest_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_streams_name_ingest API'),
  },
  {
    type: 'kibana.post_streams_name_content_export',
    connectorIdRequired: false,
    description: 'POST /api/streams/:name/content/export - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/streams/{name}/content/export'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_name_content_export',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_streams_name_content_export_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_streams_name_content_export API'),
  },
  {
    type: 'kibana.post_streams_name_content_import',
    connectorIdRequired: false,
    description: 'POST /api/streams/:name/content/import - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/streams/{name}/content/import'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_name_content_import',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_streams_name_content_import API'),
  },
  {
    type: 'kibana.get_streams_name_dashboards',
    connectorIdRequired: false,
    description: 'GET /api/streams/:name/dashboards - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/streams/{name}/dashboards'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_streams_name_dashboards',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_streams_name_dashboards API'),
  },
  {
    type: 'kibana.post_streams_name_dashboards_bulk',
    connectorIdRequired: false,
    description: 'POST /api/streams/:name/dashboards/_bulk - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/streams/{name}/dashboards/_bulk'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_name_dashboards_bulk',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_streams_name_dashboards_bulk_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_streams_name_dashboards_bulk API'),
  },
  {
    type: 'kibana.delete_streams_name_dashboards_dashboardid',
    connectorIdRequired: false,
    description: 'DELETE /api/streams/:name/dashboards/:dashboardId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/streams/{name}/dashboards/{dashboardId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_streams_name_dashboards_dashboardid',
    parameterTypes: {
      pathParams: ['name', 'dashboardId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      dashboardId: z.string().describe('Path parameter: dashboardId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_streams_name_dashboards_dashboardid API'),
  },
  {
    type: 'kibana.put_streams_name_dashboards_dashboardid',
    connectorIdRequired: false,
    description: 'PUT /api/streams/:name/dashboards/:dashboardId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/streams/{name}/dashboards/{dashboardId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_streams_name_dashboards_dashboardid',
    parameterTypes: {
      pathParams: ['name', 'dashboardId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = get_streams_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
        dashboardId: z.string().describe('Path parameter: dashboardId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_streams_name_dashboards_dashboardid API'),
  },
  {
    type: 'kibana.get_streams_name_queries',
    connectorIdRequired: false,
    description: 'GET /api/streams/:name/queries - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/streams/{name}/queries'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_streams_name_queries',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_streams_name_queries API'),
  },
  {
    type: 'kibana.post_streams_name_queries_bulk',
    connectorIdRequired: false,
    description: 'POST /api/streams/:name/queries/_bulk - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/streams/{name}/queries/_bulk'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_name_queries_bulk',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_streams_name_queries_bulk_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from post_streams_name_queries_bulk API'),
  },
  {
    type: 'kibana.delete_streams_name_queries_queryid',
    connectorIdRequired: false,
    description: 'DELETE /api/streams/:name/queries/:queryId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/streams/{name}/queries/{queryId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_streams_name_queries_queryid',
    parameterTypes: {
      pathParams: ['name', 'queryId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      queryId: z.string().describe('Path parameter: queryId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_streams_name_queries_queryid API'),
  },
  {
    type: 'kibana.put_streams_name_queries_queryid',
    connectorIdRequired: false,
    description: 'PUT /api/streams/:name/queries/:queryId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/streams/{name}/queries/{queryId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_streams_name_queries_queryid',
    parameterTypes: {
      pathParams: ['name', 'queryId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_streams_name_queries_queryid_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
        queryId: z.string().describe('Path parameter: queryId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_streams_name_queries_queryid API'),
  },
  {
    type: 'kibana.get_streams_name_rules',
    connectorIdRequired: false,
    description: 'GET /api/streams/:name/rules - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/streams/{name}/rules'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_streams_name_rules',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_streams_name_rules API'),
  },
  {
    type: 'kibana.delete_streams_name_rules_ruleid',
    connectorIdRequired: false,
    description: 'DELETE /api/streams/:name/rules/:ruleId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/streams/{name}/rules/{ruleId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_streams_name_rules_ruleid',
    parameterTypes: {
      pathParams: ['name', 'ruleId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      ruleId: z.string().describe('Path parameter: ruleId (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_streams_name_rules_ruleid API'),
  },
  {
    type: 'kibana.put_streams_name_rules_ruleid',
    connectorIdRequired: false,
    description: 'PUT /api/streams/:name/rules/:ruleId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/streams/{name}/rules/{ruleId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_streams_name_rules_ruleid',
    parameterTypes: {
      pathParams: ['name', 'ruleId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = get_streams_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
        ruleId: z.string().describe('Path parameter: ruleId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_streams_name_rules_ruleid API'),
  },
  {
    type: 'kibana.get_streams_name_significant_events',
    connectorIdRequired: false,
    description: 'GET /api/streams/:name/significant_events - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/streams/{name}/significant_events'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_streams_name_significant_events',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['from', 'to', 'bucketSize'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      from: z.any().optional().describe('Query parameter: from'),
      to: z.any().optional().describe('Query parameter: to'),
      bucketSize: z.any().optional().describe('Query parameter: bucketSize'),
    }),
    outputSchema: z.any().describe('Response from get_streams_name_significant_events API'),
  },
  {
    type: 'kibana.post_streams_name_significant_events_generate',
    connectorIdRequired: false,
    description: 'POST /api/streams/:name/significant_events/_generate - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/streams/{name}/significant_events/_generate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_name_significant_events_generate',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['connectorId', 'currentDate', 'from', 'to'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_streams_name_significant_events_generate_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
        connectorId: z.any().optional().describe('Query parameter: connectorId'),
        currentDate: z.any().optional().describe('Query parameter: currentDate'),
        from: z.any().optional().describe('Query parameter: from'),
        to: z.any().optional().describe('Query parameter: to'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z
      .any()
      .describe('Response from post_streams_name_significant_events_generate API'),
  },
  {
    type: 'kibana.post_streams_name_significant_events_preview',
    connectorIdRequired: false,
    description: 'POST /api/streams/:name/significant_events/_preview - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/streams/{name}/significant_events/_preview'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_streams_name_significant_events_preview',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['from', 'to', 'bucketSize'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_streams_name_significant_events_preview_Body;
      const additionalFields = z.object({
        name: z.string().describe('Path parameter: name (required)'),
        from: z.any().optional().describe('Query parameter: from'),
        to: z.any().optional().describe('Query parameter: to'),
        bucketSize: z.any().optional().describe('Query parameter: bucketSize'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z
      .any()
      .describe('Response from post_streams_name_significant_events_preview API'),
  },
  {
    type: 'kibana.post_synthetics_monitor_test',
    connectorIdRequired: false,
    description: 'POST /api/synthetics/monitor/test/:monitorId - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/api/synthetics/monitor/test/{monitorId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_synthetics_monitor_test',
    parameterTypes: {
      pathParams: ['monitorId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      monitorId: z.string().describe('Path parameter: monitorId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from post_synthetics_monitor_test API'),
  },
  {
    type: 'kibana.get_synthetic_monitors',
    connectorIdRequired: false,
    description: 'GET /api/synthetics/monitors - Kibana API endpoint',
    summary: 'Get monitors',
    methods: ['GET'],
    patterns: ['/api/synthetics/monitors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_synthetic_monitors',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'filter',
        'locations',
        'monitorTypes',
        'page',
        'per_page',
        'projects',
        'query',
        'schedules',
      ],
      bodyParams: [],
    },
    paramsSchema: z.object({
      filter: z.any().optional().describe('Query parameter: filter'),
      locations: z.any().optional().describe('Query parameter: locations'),
      monitorTypes: z.any().optional().describe('Query parameter: monitorTypes'),
      page: z.any().optional().describe('Query parameter: page'),
      per_page: z.any().optional().describe('Query parameter: per_page'),
      projects: z.any().optional().describe('Query parameter: projects'),
      query: z.any().optional().describe('Query parameter: query'),
      schedules: z.any().optional().describe('Query parameter: schedules'),
    }),
    outputSchema: z.any().describe('Response from get_synthetic_monitors API'),
  },
  {
    type: 'kibana.post_synthetic_monitors',
    connectorIdRequired: false,
    description: 'POST /api/synthetics/monitors - Kibana API endpoint',
    summary: 'Create a monitor',
    methods: ['POST'],
    patterns: ['/api/synthetics/monitors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_synthetic_monitors',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: post_synthetic_monitors_Body,
    outputSchema: z.any().describe('Response from post_synthetic_monitors API'),
  },
  {
    type: 'kibana.delete_synthetic_monitors',
    connectorIdRequired: false,
    description: 'POST /api/synthetics/monitors/_bulk_delete - Kibana API endpoint',
    summary: 'Delete monitors',
    methods: ['POST'],
    patterns: ['/api/synthetics/monitors/_bulk_delete'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_synthetic_monitors',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['ids'],
    },
    paramsSchema: delete_synthetic_monitors_Body,
    outputSchema: z.any().describe('Response from delete_synthetic_monitors API'),
  },
  {
    type: 'kibana.delete_synthetic_monitor',
    connectorIdRequired: false,
    description: 'DELETE /api/synthetics/monitors/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/synthetics/monitors/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_synthetic_monitor',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_synthetic_monitor API'),
  },
  {
    type: 'kibana.get_synthetic_monitor',
    connectorIdRequired: false,
    description: 'GET /api/synthetics/monitors/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/synthetics/monitors/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_synthetic_monitor',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_synthetic_monitor API'),
  },
  {
    type: 'kibana.put_synthetic_monitor',
    connectorIdRequired: false,
    description: 'PUT /api/synthetics/monitors/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/synthetics/monitors/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_synthetic_monitor',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = post_synthetic_monitors_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_synthetic_monitor API'),
  },
  {
    type: 'kibana.get_parameters',
    connectorIdRequired: false,
    description: 'GET /api/synthetics/params - Kibana API endpoint',
    summary: 'Get parameters',
    methods: ['GET'],
    patterns: ['/api/synthetics/params'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_parameters',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_parameters API'),
  },
  {
    type: 'kibana.post_parameters',
    connectorIdRequired: false,
    description: 'POST /api/synthetics/params - Kibana API endpoint',
    summary: 'Add parameters',
    methods: ['POST'],
    patterns: ['/api/synthetics/params'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_parameters',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: post_parameters_Body,
    outputSchema: z.any().describe('Response from post_parameters API'),
  },
  {
    type: 'kibana.delete_parameters',
    connectorIdRequired: false,
    description: 'DELETE /api/synthetics/params/_bulk_delete - Kibana API endpoint',
    summary: 'Delete parameters',
    methods: ['DELETE'],
    patterns: ['/api/synthetics/params/_bulk_delete'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_parameters',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({}),
    outputSchema: z.any().describe('Response from delete_parameters API'),
  },
  {
    type: 'kibana.delete_parameter',
    connectorIdRequired: false,
    description: 'DELETE /api/synthetics/params/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/synthetics/params/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_parameter',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_parameter API'),
  },
  {
    type: 'kibana.get_parameter',
    connectorIdRequired: false,
    description: 'GET /api/synthetics/params/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/synthetics/params/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_parameter',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_parameter API'),
  },
  {
    type: 'kibana.put_parameter',
    connectorIdRequired: false,
    description: 'PUT /api/synthetics/params/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/synthetics/params/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_parameter',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = put_parameter_Body;
      const additionalFields = z.object({
        id: z.string().describe('Path parameter: id (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from put_parameter API'),
  },
  {
    type: 'kibana.get_private_locations',
    connectorIdRequired: false,
    description: 'GET /api/synthetics/private_locations - Kibana API endpoint',
    summary: 'Get private locations',
    methods: ['GET'],
    patterns: ['/api/synthetics/private_locations'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_private_locations',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_private_locations API'),
  },
  {
    type: 'kibana.post_private_location',
    connectorIdRequired: false,
    description: 'POST /api/synthetics/private_locations - Kibana API endpoint',
    summary: 'Create a private location',
    methods: ['POST'],
    patterns: ['/api/synthetics/private_locations'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post_private_location',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['agentPolicyId', 'geo', 'lat', 'lon'],
    },
    paramsSchema: post_private_location_Body,
    outputSchema: z.any().describe('Response from post_private_location API'),
  },
  {
    type: 'kibana.delete_private_location',
    connectorIdRequired: false,
    description: 'DELETE /api/synthetics/private_locations/:id - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/api/synthetics/private_locations/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete_private_location',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
    }),
    outputSchema: z.any().describe('Response from delete_private_location API'),
  },
  {
    type: 'kibana.get_private_location',
    connectorIdRequired: false,
    description: 'GET /api/synthetics/private_locations/:id - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/api/synthetics/private_locations/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_private_location',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_private_location API'),
  },
  {
    type: 'kibana.put_private_location',
    connectorIdRequired: false,
    description: 'PUT /api/synthetics/private_locations/:id - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/api/synthetics/private_locations/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_private_location',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from put_private_location API'),
  },
  {
    type: 'kibana.task_manager_health',
    connectorIdRequired: false,
    description: 'GET /api/task_manager/_health - Kibana API endpoint',
    summary: 'Get the task manager health',
    methods: ['GET'],
    patterns: ['/api/task_manager/_health'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-task_manager_health',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from task_manager_health API'),
  },
  {
    type: 'kibana.DeleteTimelines',
    connectorIdRequired: false,
    description: 'DELETE /api/timeline - Kibana API endpoint',
    summary: 'Delete Timelines or Timeline templates',
    methods: ['DELETE'],
    patterns: ['/api/timeline'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletetimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({}),
    outputSchema: z.any().describe('Response from DeleteTimelines API'),
  },
  {
    type: 'kibana.GetTimeline',
    connectorIdRequired: false,
    description: 'GET /api/timeline - Kibana API endpoint',
    summary: 'Get Timeline or Timeline template details',
    methods: ['GET'],
    patterns: ['/api/timeline'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-gettimeline',
    parameterTypes: {
      pathParams: [],
      urlParams: ['template_timeline_id', 'id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      template_timeline_id: z.any().optional().describe('Query parameter: template_timeline_id'),
      id: z.any().optional().describe('Query parameter: id'),
    }),
    outputSchema: z.any().describe('Response from GetTimeline API'),
  },
  {
    type: 'kibana.PatchTimeline',
    connectorIdRequired: false,
    description: 'PATCH /api/timeline - Kibana API endpoint',
    summary: 'Update a Timeline',
    methods: ['PATCH'],
    patterns: ['/api/timeline'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-patchtimeline',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['timeline', 'timelineId', 'version'],
    },
    paramsSchema: PatchTimeline_Body,
    outputSchema: z.any().describe('Response from PatchTimeline API'),
  },
  {
    type: 'kibana.CreateTimelines',
    connectorIdRequired: false,
    description: 'POST /api/timeline - Kibana API endpoint',
    summary: 'Create a Timeline or Timeline template',
    methods: ['POST'],
    patterns: ['/api/timeline'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createtimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'status',
        'templateTimelineId',
        'templateTimelineVersion',
        'timeline',
        'timelineId',
        'timelineType',
        'version',
      ],
    },
    paramsSchema: CreateTimelines_Body,
    outputSchema: z.any().describe('Response from CreateTimelines API'),
  },
  {
    type: 'kibana.CopyTimeline',
    connectorIdRequired: false,
    description: 'GET /api/timeline/_copy - Kibana API endpoint',
    summary: 'Copies timeline or timeline template',
    methods: ['GET'],
    patterns: ['/api/timeline/_copy'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-copytimeline',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from CopyTimeline API'),
  },
  {
    type: 'kibana.GetDraftTimelines',
    connectorIdRequired: false,
    description: 'GET /api/timeline/_draft - Kibana API endpoint',
    summary: 'Get draft Timeline or Timeline template details',
    methods: ['GET'],
    patterns: ['/api/timeline/_draft'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getdrafttimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from GetDraftTimelines API'),
  },
  {
    type: 'kibana.CleanDraftTimelines',
    connectorIdRequired: false,
    description: 'POST /api/timeline/_draft - Kibana API endpoint',
    summary: 'Create a clean draft Timeline or Timeline template',
    methods: ['POST'],
    patterns: ['/api/timeline/_draft'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-cleandrafttimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['timelineType'],
    },
    paramsSchema: CleanDraftTimelines_Body,
    outputSchema: z.any().describe('Response from CleanDraftTimelines API'),
  },
  {
    type: 'kibana.ExportTimelines',
    connectorIdRequired: false,
    description: 'POST /api/timeline/_export - Kibana API endpoint',
    summary: 'Export Timelines',
    methods: ['POST'],
    patterns: ['/api/timeline/_export'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-exporttimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: ['file_name'],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = ExportTimelines_Body;
      const additionalFields = z.object({
        file_name: z.any().optional().describe('Query parameter: file_name'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from ExportTimelines API'),
  },
  {
    type: 'kibana.PersistFavoriteRoute',
    connectorIdRequired: false,
    description: 'PATCH /api/timeline/_favorite - Kibana API endpoint',
    summary: 'Favorite a Timeline or Timeline template',
    methods: ['PATCH'],
    patterns: ['/api/timeline/_favorite'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-persistfavoriteroute',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['templateTimelineId', 'templateTimelineVersion', 'timelineId', 'timelineType'],
    },
    paramsSchema: PersistFavoriteRoute_Body,
    outputSchema: z.any().describe('Response from PersistFavoriteRoute API'),
  },
  {
    type: 'kibana.ImportTimelines',
    connectorIdRequired: false,
    description: 'POST /api/timeline/_import - Kibana API endpoint',
    summary: 'Import Timelines',
    methods: ['POST'],
    patterns: ['/api/timeline/_import'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-importtimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['file', 'isImmutable'],
    },
    paramsSchema: ImportTimelines_Body,
    outputSchema: z.any().describe('Response from ImportTimelines API'),
  },
  {
    type: 'kibana.InstallPrepackedTimelines',
    connectorIdRequired: false,
    description: 'POST /api/timeline/_prepackaged - Kibana API endpoint',
    summary: 'Install prepackaged Timelines',
    methods: ['POST'],
    patterns: ['/api/timeline/_prepackaged'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-installprepackedtimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: InstallPrepackedTimelines_Body,
    outputSchema: z.any().describe('Response from InstallPrepackedTimelines API'),
  },
  {
    type: 'kibana.ResolveTimeline',
    connectorIdRequired: false,
    description: 'GET /api/timeline/resolve - Kibana API endpoint',
    summary: 'Get an existing saved Timeline or Timeline template',
    methods: ['GET'],
    patterns: ['/api/timeline/resolve'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-resolvetimeline',
    parameterTypes: {
      pathParams: [],
      urlParams: ['template_timeline_id', 'id'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      template_timeline_id: z.any().optional().describe('Query parameter: template_timeline_id'),
      id: z.any().optional().describe('Query parameter: id'),
    }),
    outputSchema: z.any().describe('Response from ResolveTimeline API'),
  },
  {
    type: 'kibana.GetTimelines',
    connectorIdRequired: false,
    description: 'GET /api/timelines - Kibana API endpoint',
    summary: 'Get Timelines or Timeline templates',
    methods: ['GET'],
    patterns: ['/api/timelines'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-gettimelines',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from GetTimelines API'),
  },
  {
    type: 'kibana.get_upgrade_status',
    connectorIdRequired: false,
    description: 'GET /api/upgrade_assistant/status - Kibana API endpoint',
    summary: 'Get the upgrade readiness status',
    methods: ['GET'],
    patterns: ['/api/upgrade_assistant/status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_upgrade_status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_upgrade_status API'),
  },
  {
    type: 'kibana.get_uptime_settings',
    connectorIdRequired: false,
    description: 'GET /api/uptime/settings - Kibana API endpoint',
    summary: 'Get uptime settings',
    methods: ['GET'],
    patterns: ['/api/uptime/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get_uptime_settings',
    parameterTypes: {
      pathParams: [],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from get_uptime_settings API'),
  },
  {
    type: 'kibana.put_uptime_settings',
    connectorIdRequired: false,
    description: 'PUT /api/uptime/settings - Kibana API endpoint',
    summary: 'Update uptime settings',
    methods: ['PUT'],
    patterns: ['/api/uptime/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put_uptime_settings',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: [
        'certAgeThreshold',
        'certExpirationThreshold',
        'defaultConnectors',
        'defaultEmail',
        'bcc',
        'cc',
        'to',
      ],
    },
    paramsSchema: put_uptime_settings_Body,
    outputSchema: z.any().describe('Response from put_uptime_settings API'),
  },
  {
    type: 'kibana.findSlosOp',
    connectorIdRequired: false,
    description: 'GET /s/:spaceId/api/observability/slos - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/s/{spaceId}/api/observability/slos'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findslosop',
    parameterTypes: {
      pathParams: ['spaceId'],
      urlParams: ['kqlQuery', 'size', 'searchAfter', 'page', 'perPage'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      spaceId: z.string().describe('Path parameter: spaceId (required)'),
      kqlQuery: z.any().optional().describe('Query parameter: kqlQuery'),
      size: z.any().optional().describe('Query parameter: size'),
      searchAfter: z.any().optional().describe('Query parameter: searchAfter'),
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
    }),
    outputSchema: z.any().describe('Response from findSlosOp API'),
  },
  {
    type: 'kibana.createSloOp',
    connectorIdRequired: false,
    description: 'POST /s/:spaceId/api/observability/slos - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/s/{spaceId}/api/observability/slos'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createsloop',
    parameterTypes: {
      pathParams: ['spaceId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = SLOs_create_slo_request;
      const additionalFields = z.object({
        spaceId: z.string().describe('Path parameter: spaceId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from createSloOp API'),
  },
  {
    type: 'kibana.bulkDeleteOp',
    connectorIdRequired: false,
    description: 'POST /s/:spaceId/api/observability/slos/_bulk_delete - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkdeleteop',
    parameterTypes: {
      pathParams: ['spaceId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = SLOs_bulk_delete_request;
      const additionalFields = z.object({
        spaceId: z.string().describe('Path parameter: spaceId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from bulkDeleteOp API'),
  },
  {
    type: 'kibana.bulkDeleteStatusOp',
    connectorIdRequired: false,
    description:
      'GET /s/:spaceId/api/observability/slos/_bulk_delete/:taskId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete/{taskId}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkdeletestatusop',
    parameterTypes: {
      pathParams: ['spaceId', 'taskId'],
      urlParams: ['query'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      spaceId: z.string().describe('Path parameter: spaceId (required)'),
      taskId: z.string().describe('Path parameter: taskId (required)'),
      query: z.record(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from bulkDeleteStatusOp API'),
  },
  {
    type: 'kibana.deleteRollupDataOp',
    connectorIdRequired: false,
    description: 'POST /s/:spaceId/api/observability/slos/_bulk_purge_rollup - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/s/{spaceId}/api/observability/slos/_bulk_purge_rollup'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleterollupdataop',
    parameterTypes: {
      pathParams: ['spaceId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = SLOs_bulk_purge_rollup_request;
      const additionalFields = z.object({
        spaceId: z.string().describe('Path parameter: spaceId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from deleteRollupDataOp API'),
  },
  {
    type: 'kibana.deleteSloInstancesOp',
    connectorIdRequired: false,
    description: 'POST /s/:spaceId/api/observability/slos/_delete_instances - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/s/{spaceId}/api/observability/slos/_delete_instances'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletesloinstancesop',
    parameterTypes: {
      pathParams: ['spaceId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = SLOs_delete_slo_instances_request;
      const additionalFields = z.object({
        spaceId: z.string().describe('Path parameter: spaceId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from deleteSloInstancesOp API'),
  },
  {
    type: 'kibana.deleteSloOp',
    connectorIdRequired: false,
    description: 'DELETE /s/:spaceId/api/observability/slos/:sloId - Kibana API endpoint',
    methods: ['DELETE'],
    patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletesloop',
    parameterTypes: {
      pathParams: ['spaceId', 'sloId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      spaceId: z.string().describe('Path parameter: spaceId (required)'),
      sloId: z.string().describe('Path parameter: sloId (required)'),
    }),
    outputSchema: z.any().describe('Response from deleteSloOp API'),
  },
  {
    type: 'kibana.getSloOp',
    connectorIdRequired: false,
    description: 'GET /s/:spaceId/api/observability/slos/:sloId - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getsloop',
    parameterTypes: {
      pathParams: ['spaceId', 'sloId'],
      urlParams: ['instanceId'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      spaceId: z.string().describe('Path parameter: spaceId (required)'),
      sloId: z.string().describe('Path parameter: sloId (required)'),
      instanceId: z.any().optional().describe('Query parameter: instanceId'),
    }),
    outputSchema: z.any().describe('Response from getSloOp API'),
  },
  {
    type: 'kibana.updateSloOp',
    connectorIdRequired: false,
    description: 'PUT /s/:spaceId/api/observability/slos/:sloId - Kibana API endpoint',
    methods: ['PUT'],
    patterns: ['/s/{spaceId}/api/observability/slos/{sloId}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatesloop',
    parameterTypes: {
      pathParams: ['spaceId', 'sloId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: (() => {
      const baseSchema = SLOs_update_slo_request;
      const additionalFields = z.object({
        spaceId: z.string().describe('Path parameter: spaceId (required)'),
        sloId: z.string().describe('Path parameter: sloId (required)'),
      });

      // If it's a union, extend each option with the additional fields
      if (baseSchema._def && baseSchema._def.options) {
        // Check if this is a discriminated union by looking for a common 'type' field
        const hasTypeDiscriminator = baseSchema._def.options.every(
          (option: any) =>
            option instanceof z.ZodObject && option.shape.type && option.shape.type._def.value
        );

        const extendedOptions = baseSchema._def.options.map((option: any) =>
          option.extend
            ? option.extend(additionalFields.shape)
            : z.intersection(option, additionalFields)
        );

        if (hasTypeDiscriminator) {
          // Use discriminated union for better JSON schema generation
          return z.discriminatedUnion('type', extendedOptions);
        } else {
          // Use regular union
          return z.union(extendedOptions);
        }
      }

      // If it's not a union, use intersection
      return z.intersection(baseSchema, additionalFields);
    })(),
    outputSchema: z.any().describe('Response from updateSloOp API'),
  },
  {
    type: 'kibana.resetSloOp',
    connectorIdRequired: false,
    description: 'POST /s/:spaceId/api/observability/slos/:sloId/_reset - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/_reset'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-resetsloop',
    parameterTypes: {
      pathParams: ['spaceId', 'sloId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      spaceId: z.string().describe('Path parameter: spaceId (required)'),
      sloId: z.string().describe('Path parameter: sloId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from resetSloOp API'),
  },
  {
    type: 'kibana.disableSloOp',
    connectorIdRequired: false,
    description: 'POST /s/:spaceId/api/observability/slos/:sloId/disable - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/disable'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-disablesloop',
    parameterTypes: {
      pathParams: ['spaceId', 'sloId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      spaceId: z.string().describe('Path parameter: spaceId (required)'),
      sloId: z.string().describe('Path parameter: sloId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from disableSloOp API'),
  },
  {
    type: 'kibana.enableSloOp',
    connectorIdRequired: false,
    description: 'POST /s/:spaceId/api/observability/slos/:sloId/enable - Kibana API endpoint',
    methods: ['POST'],
    patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/enable'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-enablesloop',
    parameterTypes: {
      pathParams: ['spaceId', 'sloId'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      spaceId: z.string().describe('Path parameter: spaceId (required)'),
      sloId: z.string().describe('Path parameter: sloId (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from enableSloOp API'),
  },
  {
    type: 'kibana.getDefinitionsOp',
    connectorIdRequired: false,
    description: 'GET /s/:spaceId/internal/observability/slos/_definitions - Kibana API endpoint',
    methods: ['GET'],
    patterns: ['/s/{spaceId}/internal/observability/slos/_definitions'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getdefinitionsop',
    parameterTypes: {
      pathParams: ['spaceId'],
      urlParams: ['includeOutdatedOnly', 'tags', 'search', 'page', 'perPage'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      spaceId: z.string().describe('Path parameter: spaceId (required)'),
      includeOutdatedOnly: z.any().optional().describe('Query parameter: includeOutdatedOnly'),
      tags: z.any().optional().describe('Query parameter: tags'),
      search: z.any().optional().describe('Query parameter: search'),
      page: z.any().optional().describe('Query parameter: page'),
      perPage: z.any().optional().describe('Query parameter: perPage'),
    }),
    outputSchema: z.any().describe('Response from getDefinitionsOp API'),
  },
];

export const KIBANA_CONNECTOR_COUNT = 483;
