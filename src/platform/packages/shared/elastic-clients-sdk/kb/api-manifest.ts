/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * AUTO-GENERATED from src/kb/apis/*.ts.
 * DO NOT EDIT BY HAND. Regenerate after running the code generator.
 */

import type { HttpMethod } from './types'

/** Cheap metadata for every Kibana API command. No Zod schemas built. */
export interface KbApiMeta {
  readonly name: string
  readonly namespace: string
  readonly description: string
  readonly method: HttpMethod
  readonly path: string
  /** File stem under src/kb/apis/ that holds the full KbApiDefinition. */
  readonly namespaceFile: string
}

export const kbApiManifest: readonly KbApiMeta[] = [
  {
    "name": "post-agent-builder-a2a-agentid",
    "namespace": "agent-builder",
    "description": "Send A2A task",
    "method": "POST",
    "path": "/api/agent_builder/a2a/{agentId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-a2a-agentid-json",
    "namespace": "agent-builder",
    "description": "Get A2A agent card",
    "method": "GET",
    "path": "/api/agent_builder/a2a/{agentId}.json",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-agents",
    "namespace": "agent-builder",
    "description": "List agents",
    "method": "GET",
    "path": "/api/agent_builder/agents",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-agents",
    "namespace": "agent-builder",
    "description": "Create an agent",
    "method": "POST",
    "path": "/api/agent_builder/agents",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-agents-agent-id-consumption",
    "namespace": "agent-builder",
    "description": "Get agent consumption data",
    "method": "POST",
    "path": "/api/agent_builder/agents/{agent_id}/consumption",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "delete-agent-builder-agents-id",
    "namespace": "agent-builder",
    "description": "Delete an agent",
    "method": "DELETE",
    "path": "/api/agent_builder/agents/{id}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-agents-id",
    "namespace": "agent-builder",
    "description": "Get an agent by ID",
    "method": "GET",
    "path": "/api/agent_builder/agents/{id}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "put-agent-builder-agents-id",
    "namespace": "agent-builder",
    "description": "Update an agent",
    "method": "PUT",
    "path": "/api/agent_builder/agents/{id}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-conversations",
    "namespace": "agent-builder",
    "description": "List conversations",
    "method": "GET",
    "path": "/api/agent_builder/conversations",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "delete-agent-builder-conversations-conversation-id",
    "namespace": "agent-builder",
    "description": "Delete conversation by ID",
    "method": "DELETE",
    "path": "/api/agent_builder/conversations/{conversation_id}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-conversations-conversation-id",
    "namespace": "agent-builder",
    "description": "Get conversation by ID",
    "method": "GET",
    "path": "/api/agent_builder/conversations/{conversation_id}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-conversations-conversation-id-attachments",
    "namespace": "agent-builder",
    "description": "List conversation attachments",
    "method": "GET",
    "path": "/api/agent_builder/conversations/{conversation_id}/attachments",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-conversations-conversation-id-attachments",
    "namespace": "agent-builder",
    "description": "Create conversation attachment",
    "method": "POST",
    "path": "/api/agent_builder/conversations/{conversation_id}/attachments",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "delete-agent-builder-conversations-conversation-id-attachments-attachment-id",
    "namespace": "agent-builder",
    "description": "Delete conversation attachment",
    "method": "DELETE",
    "path": "/api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "patch-agent-builder-conversations-conversation-id-attachments-attachment-id",
    "namespace": "agent-builder",
    "description": "Rename attachment",
    "method": "PATCH",
    "path": "/api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "put-agent-builder-conversations-conversation-id-attachments-attachment-id",
    "namespace": "agent-builder",
    "description": "Update conversation attachment",
    "method": "PUT",
    "path": "/api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-conversations-conversation-id-attachments-attachment-id-restore",
    "namespace": "agent-builder",
    "description": "Restore deleted attachment",
    "method": "POST",
    "path": "/api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}/_restore",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "put-agent-builder-conversations-conversation-id-attachments-attachment-id-origin",
    "namespace": "agent-builder",
    "description": "Update attachment origin",
    "method": "PUT",
    "path": "/api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}/origin",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-conversations-conversation-id-attachments-stale",
    "namespace": "agent-builder",
    "description": "Check attachment staleness",
    "method": "GET",
    "path": "/api/agent_builder/conversations/{conversation_id}/attachments/stale",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-converse",
    "namespace": "agent-builder",
    "description": "Send chat message",
    "method": "POST",
    "path": "/api/agent_builder/converse",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-converse-async",
    "namespace": "agent-builder",
    "description": "Send chat message (streaming)",
    "method": "POST",
    "path": "/api/agent_builder/converse/async",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-mcp",
    "namespace": "agent-builder",
    "description": "MCP server",
    "method": "POST",
    "path": "/api/agent_builder/mcp",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-plugins",
    "namespace": "agent-builder",
    "description": "List plugins",
    "method": "GET",
    "path": "/api/agent_builder/plugins",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "delete-agent-builder-plugins-pluginid",
    "namespace": "agent-builder",
    "description": "Delete a plugin",
    "method": "DELETE",
    "path": "/api/agent_builder/plugins/{pluginId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-plugins-pluginid",
    "namespace": "agent-builder",
    "description": "Get a plugin by id",
    "method": "GET",
    "path": "/api/agent_builder/plugins/{pluginId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-plugins-install",
    "namespace": "agent-builder",
    "description": "Install a plugin",
    "method": "POST",
    "path": "/api/agent_builder/plugins/install",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-skills",
    "namespace": "agent-builder",
    "description": "List skills",
    "method": "GET",
    "path": "/api/agent_builder/skills",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-skills",
    "namespace": "agent-builder",
    "description": "Create a skill",
    "method": "POST",
    "path": "/api/agent_builder/skills",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "delete-agent-builder-skills-skillid",
    "namespace": "agent-builder",
    "description": "Delete a skill",
    "method": "DELETE",
    "path": "/api/agent_builder/skills/{skillId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-skills-skillid",
    "namespace": "agent-builder",
    "description": "Get a skill by id",
    "method": "GET",
    "path": "/api/agent_builder/skills/{skillId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "put-agent-builder-skills-skillid",
    "namespace": "agent-builder",
    "description": "Update a skill",
    "method": "PUT",
    "path": "/api/agent_builder/skills/{skillId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-tools",
    "namespace": "agent-builder",
    "description": "List tools",
    "method": "GET",
    "path": "/api/agent_builder/tools",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-tools",
    "namespace": "agent-builder",
    "description": "Create a tool",
    "method": "POST",
    "path": "/api/agent_builder/tools",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "post-agent-builder-tools-execute",
    "namespace": "agent-builder",
    "description": "Run a tool",
    "method": "POST",
    "path": "/api/agent_builder/tools/_execute",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "delete-agent-builder-tools-toolid",
    "namespace": "agent-builder",
    "description": "Delete a tool",
    "method": "DELETE",
    "path": "/api/agent_builder/tools/{toolId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "get-agent-builder-tools-toolid",
    "namespace": "agent-builder",
    "description": "Get a tool by id",
    "method": "GET",
    "path": "/api/agent_builder/tools/{toolId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "put-agent-builder-tools-toolid",
    "namespace": "agent-builder",
    "description": "Update a tool",
    "method": "PUT",
    "path": "/api/agent_builder/tools/{toolId}",
    "namespaceFile": "agent-builder"
  },
  {
    "name": "delete-alerting-rule-id",
    "namespace": "alerting",
    "description": "Delete a rule",
    "method": "DELETE",
    "path": "/api/alerting/rule/{id}",
    "namespaceFile": "alerting"
  },
  {
    "name": "get-alerting-rule-id",
    "namespace": "alerting",
    "description": "Get rule details",
    "method": "GET",
    "path": "/api/alerting/rule/{id}",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-id",
    "namespace": "alerting",
    "description": "Create a rule",
    "method": "POST",
    "path": "/api/alerting/rule/{id}",
    "namespaceFile": "alerting"
  },
  {
    "name": "put-alerting-rule-id",
    "namespace": "alerting",
    "description": "Update a rule",
    "method": "PUT",
    "path": "/api/alerting/rule/{id}",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-id-disable",
    "namespace": "alerting",
    "description": "Disable a rule",
    "method": "POST",
    "path": "/api/alerting/rule/{id}/_disable",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-id-enable",
    "namespace": "alerting",
    "description": "Enable a rule",
    "method": "POST",
    "path": "/api/alerting/rule/{id}/_enable",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-id-mute-all",
    "namespace": "alerting",
    "description": "Mute all alerts",
    "method": "POST",
    "path": "/api/alerting/rule/{id}/_mute_all",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-id-unmute-all",
    "namespace": "alerting",
    "description": "Unmute all alerts",
    "method": "POST",
    "path": "/api/alerting/rule/{id}/_unmute_all",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-id-update-api-key",
    "namespace": "alerting",
    "description": "Update the API key for a rule",
    "method": "POST",
    "path": "/api/alerting/rule/{id}/_update_api_key",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-id-snooze-schedule",
    "namespace": "alerting",
    "description": "Schedule a snooze for the rule",
    "method": "POST",
    "path": "/api/alerting/rule/{id}/snooze_schedule",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-rule-id-alert-alert-id-mute",
    "namespace": "alerting",
    "description": "Mute an alert",
    "method": "POST",
    "path": "/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rule-rule-id-alert-alert-id-unmute",
    "namespace": "alerting",
    "description": "Unmute an alert",
    "method": "POST",
    "path": "/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute",
    "namespaceFile": "alerting"
  },
  {
    "name": "delete-alerting-rule-ruleid-snooze-schedule-scheduleid",
    "namespace": "alerting",
    "description": "Delete a snooze schedule for a rule",
    "method": "DELETE",
    "path": "/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}",
    "namespaceFile": "alerting"
  },
  {
    "name": "get-alerting-rules-find",
    "namespace": "alerting",
    "description": "Get information about rules",
    "method": "GET",
    "path": "/api/alerting/rules/_find",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rules-backfill-find",
    "namespace": "alerting",
    "description": "Find backfills for rules",
    "method": "POST",
    "path": "/api/alerting/rules/backfill/_find",
    "namespaceFile": "alerting"
  },
  {
    "name": "post-alerting-rules-backfill-schedule",
    "namespace": "alerting",
    "description": "Schedule a backfill for rules",
    "method": "POST",
    "path": "/api/alerting/rules/backfill/_schedule",
    "namespaceFile": "alerting"
  },
  {
    "name": "delete-alerting-rules-backfill-id",
    "namespace": "alerting",
    "description": "Delete a backfill by ID",
    "method": "DELETE",
    "path": "/api/alerting/rules/backfill/{id}",
    "namespaceFile": "alerting"
  },
  {
    "name": "get-alerting-rules-backfill-id",
    "namespace": "alerting",
    "description": "Get a backfill by ID",
    "method": "GET",
    "path": "/api/alerting/rules/backfill/{id}",
    "namespaceFile": "alerting"
  },
  {
    "name": "delete-agent-configuration",
    "namespace": "apm-agent-configuration",
    "description": "Delete agent configuration",
    "method": "DELETE",
    "path": "/api/apm/settings/agent-configuration",
    "namespaceFile": "apm-agent-configuration"
  },
  {
    "name": "get-agent-configurations",
    "namespace": "apm-agent-configuration",
    "description": "Get a list of agent configurations",
    "method": "GET",
    "path": "/api/apm/settings/agent-configuration",
    "namespaceFile": "apm-agent-configuration"
  },
  {
    "name": "create-update-agent-configuration",
    "namespace": "apm-agent-configuration",
    "description": "Create or update agent configuration",
    "method": "PUT",
    "path": "/api/apm/settings/agent-configuration",
    "namespaceFile": "apm-agent-configuration"
  },
  {
    "name": "get-agent-name-for-service",
    "namespace": "apm-agent-configuration",
    "description": "Get agent name for service",
    "method": "GET",
    "path": "/api/apm/settings/agent-configuration/agent_name",
    "namespaceFile": "apm-agent-configuration"
  },
  {
    "name": "get-environments-for-service",
    "namespace": "apm-agent-configuration",
    "description": "Get environments for service",
    "method": "GET",
    "path": "/api/apm/settings/agent-configuration/environments",
    "namespaceFile": "apm-agent-configuration"
  },
  {
    "name": "search-single-configuration",
    "namespace": "apm-agent-configuration",
    "description": "Lookup single agent configuration",
    "method": "POST",
    "path": "/api/apm/settings/agent-configuration/search",
    "namespaceFile": "apm-agent-configuration"
  },
  {
    "name": "get-single-agent-configuration",
    "namespace": "apm-agent-configuration",
    "description": "Get single agent configuration",
    "method": "GET",
    "path": "/api/apm/settings/agent-configuration/view",
    "namespaceFile": "apm-agent-configuration"
  },
  {
    "name": "create-agent-key",
    "namespace": "apm-agent-keys",
    "description": "Create an APM agent key",
    "method": "POST",
    "path": "/api/apm/agent_keys",
    "namespaceFile": "apm-agent-keys"
  },
  {
    "name": "create-annotation",
    "namespace": "apm-annotations",
    "description": "Create a service annotation",
    "method": "POST",
    "path": "/api/apm/services/{serviceName}/annotation",
    "namespaceFile": "apm-annotations"
  },
  {
    "name": "get-annotation",
    "namespace": "apm-annotations",
    "description": "Search for annotations",
    "method": "GET",
    "path": "/api/apm/services/{serviceName}/annotation/search",
    "namespaceFile": "apm-annotations"
  },
  {
    "name": "save-apm-server-schema",
    "namespace": "apm-server-schema",
    "description": "Save APM server schema",
    "method": "POST",
    "path": "/api/apm/fleet/apm_server_schema",
    "namespaceFile": "apm-server-schema"
  },
  {
    "name": "get-source-maps",
    "namespace": "apm-sourcemaps",
    "description": "Get source maps",
    "method": "GET",
    "path": "/api/apm/sourcemaps",
    "namespaceFile": "apm-sourcemaps"
  },
  {
    "name": "upload-source-map",
    "namespace": "apm-sourcemaps",
    "description": "Upload a source map",
    "method": "POST",
    "path": "/api/apm/sourcemaps",
    "namespaceFile": "apm-sourcemaps"
  },
  {
    "name": "delete-source-map",
    "namespace": "apm-sourcemaps",
    "description": "Delete source map",
    "method": "DELETE",
    "path": "/api/apm/sourcemaps/{id}",
    "namespaceFile": "apm-sourcemaps"
  },
  {
    "name": "get-actions-connector-types",
    "namespace": "connectors",
    "description": "Get connector types",
    "method": "GET",
    "path": "/api/actions/connector_types",
    "namespaceFile": "connectors"
  },
  {
    "name": "get-actions-connector-oauth-callback",
    "namespace": "connectors",
    "description": "Handle OAuth callback",
    "method": "GET",
    "path": "/api/actions/connector/_oauth_callback",
    "namespaceFile": "connectors"
  },
  {
    "name": "delete-actions-connector-id",
    "namespace": "connectors",
    "description": "Delete a connector",
    "method": "DELETE",
    "path": "/api/actions/connector/{id}",
    "namespaceFile": "connectors"
  },
  {
    "name": "get-actions-connector-id",
    "namespace": "connectors",
    "description": "Get connector information",
    "method": "GET",
    "path": "/api/actions/connector/{id}",
    "namespaceFile": "connectors"
  },
  {
    "name": "post-actions-connector-id",
    "namespace": "connectors",
    "description": "Create a connector",
    "method": "POST",
    "path": "/api/actions/connector/{id}",
    "namespaceFile": "connectors"
  },
  {
    "name": "put-actions-connector-id",
    "namespace": "connectors",
    "description": "Update a connector",
    "method": "PUT",
    "path": "/api/actions/connector/{id}",
    "namespaceFile": "connectors"
  },
  {
    "name": "post-actions-connector-id-execute",
    "namespace": "connectors",
    "description": "Run a connector",
    "method": "POST",
    "path": "/api/actions/connector/{id}/_execute",
    "namespaceFile": "connectors"
  },
  {
    "name": "get-actions-connectors",
    "namespace": "connectors",
    "description": "Get all connectors",
    "method": "GET",
    "path": "/api/actions/connectors",
    "namespaceFile": "connectors"
  },
  {
    "name": "get-fleet-data-streams",
    "namespace": "data-streams",
    "description": "Get data streams",
    "method": "GET",
    "path": "/api/fleet/data_streams",
    "namespaceFile": "data-streams"
  },
  {
    "name": "get-fleet-epm-data-streams",
    "namespace": "data-streams",
    "description": "Get data streams",
    "method": "GET",
    "path": "/api/fleet/epm/data_streams",
    "namespaceFile": "data-streams"
  },
  {
    "name": "get-all-data-views-default",
    "namespace": "data-views",
    "description": "Get all data views",
    "method": "GET",
    "path": "/api/data_views",
    "namespaceFile": "data-views"
  },
  {
    "name": "create-data-view-defaultw",
    "namespace": "data-views",
    "description": "Create a data view",
    "method": "POST",
    "path": "/api/data_views/data_view",
    "namespaceFile": "data-views"
  },
  {
    "name": "delete-data-view-default",
    "namespace": "data-views",
    "description": "Delete a data view",
    "method": "DELETE",
    "path": "/api/data_views/data_view/{viewId}",
    "namespaceFile": "data-views"
  },
  {
    "name": "get-data-view-default",
    "namespace": "data-views",
    "description": "Get a data view",
    "method": "GET",
    "path": "/api/data_views/data_view/{viewId}",
    "namespaceFile": "data-views"
  },
  {
    "name": "update-data-view-default",
    "namespace": "data-views",
    "description": "Update a data view",
    "method": "POST",
    "path": "/api/data_views/data_view/{viewId}",
    "namespaceFile": "data-views"
  },
  {
    "name": "update-fields-metadata-default",
    "namespace": "data-views",
    "description": "Update data view fields metadata",
    "method": "POST",
    "path": "/api/data_views/data_view/{viewId}/fields",
    "namespaceFile": "data-views"
  },
  {
    "name": "create-runtime-field-default",
    "namespace": "data-views",
    "description": "Create a runtime field",
    "method": "POST",
    "path": "/api/data_views/data_view/{viewId}/runtime_field",
    "namespaceFile": "data-views"
  },
  {
    "name": "create-update-runtime-field-default",
    "namespace": "data-views",
    "description": "Create or update a runtime field",
    "method": "PUT",
    "path": "/api/data_views/data_view/{viewId}/runtime_field",
    "namespaceFile": "data-views"
  },
  {
    "name": "delete-runtime-field-default",
    "namespace": "data-views",
    "description": "Delete a runtime field from a data view",
    "method": "DELETE",
    "path": "/api/data_views/data_view/{viewId}/runtime_field/{fieldName}",
    "namespaceFile": "data-views"
  },
  {
    "name": "get-runtime-field-default",
    "namespace": "data-views",
    "description": "Get a runtime field",
    "method": "GET",
    "path": "/api/data_views/data_view/{viewId}/runtime_field/{fieldName}",
    "namespaceFile": "data-views"
  },
  {
    "name": "update-runtime-field-default",
    "namespace": "data-views",
    "description": "Update a runtime field",
    "method": "POST",
    "path": "/api/data_views/data_view/{viewId}/runtime_field/{fieldName}",
    "namespaceFile": "data-views"
  },
  {
    "name": "get-default-data-view-default",
    "namespace": "data-views",
    "description": "Get the default data view",
    "method": "GET",
    "path": "/api/data_views/default",
    "namespaceFile": "data-views"
  },
  {
    "name": "set-default-datail-view-default",
    "namespace": "data-views",
    "description": "Set the default data view",
    "method": "POST",
    "path": "/api/data_views/default",
    "namespaceFile": "data-views"
  },
  {
    "name": "swap-data-views-default",
    "namespace": "data-views",
    "description": "Swap saved object references",
    "method": "POST",
    "path": "/api/data_views/swap_references",
    "namespaceFile": "data-views"
  },
  {
    "name": "preview-swap-data-views-default",
    "namespace": "data-views",
    "description": "Preview a saved object reference swap",
    "method": "POST",
    "path": "/api/data_views/swap_references/_preview",
    "namespaceFile": "data-views"
  },
  {
    "name": "post-fleet-agents-agentid-actions",
    "namespace": "elastic-agent-actions",
    "description": "Create an agent action",
    "method": "POST",
    "path": "/api/fleet/agents/{agentId}/actions",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-agentid-reassign",
    "namespace": "elastic-agent-actions",
    "description": "Reassign an agent",
    "method": "POST",
    "path": "/api/fleet/agents/{agentId}/reassign",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-agentid-request-diagnostics",
    "namespace": "elastic-agent-actions",
    "description": "Request agent diagnostics",
    "method": "POST",
    "path": "/api/fleet/agents/{agentId}/request_diagnostics",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-agentid-rollback",
    "namespace": "elastic-agent-actions",
    "description": "Rollback an agent",
    "method": "POST",
    "path": "/api/fleet/agents/{agentId}/rollback",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-agentid-unenroll",
    "namespace": "elastic-agent-actions",
    "description": "Unenroll an agent",
    "method": "POST",
    "path": "/api/fleet/agents/{agentId}/unenroll",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-agentid-upgrade",
    "namespace": "elastic-agent-actions",
    "description": "Upgrade an agent",
    "method": "POST",
    "path": "/api/fleet/agents/{agentId}/upgrade",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "get-fleet-agents-action-status",
    "namespace": "elastic-agent-actions",
    "description": "Get an agent action status",
    "method": "GET",
    "path": "/api/fleet/agents/action_status",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-actions-actionid-cancel",
    "namespace": "elastic-agent-actions",
    "description": "Cancel an agent action",
    "method": "POST",
    "path": "/api/fleet/agents/actions/{actionId}/cancel",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-bulk-reassign",
    "namespace": "elastic-agent-actions",
    "description": "Bulk reassign agents",
    "method": "POST",
    "path": "/api/fleet/agents/bulk_reassign",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-bulk-request-diagnostics",
    "namespace": "elastic-agent-actions",
    "description": "Bulk request diagnostics from agents",
    "method": "POST",
    "path": "/api/fleet/agents/bulk_request_diagnostics",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-bulk-rollback",
    "namespace": "elastic-agent-actions",
    "description": "Bulk rollback agents",
    "method": "POST",
    "path": "/api/fleet/agents/bulk_rollback",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-bulk-unenroll",
    "namespace": "elastic-agent-actions",
    "description": "Bulk unenroll agents",
    "method": "POST",
    "path": "/api/fleet/agents/bulk_unenroll",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-bulk-update-agent-tags",
    "namespace": "elastic-agent-actions",
    "description": "Bulk update agent tags",
    "method": "POST",
    "path": "/api/fleet/agents/bulk_update_agent_tags",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "post-fleet-agents-bulk-upgrade",
    "namespace": "elastic-agent-actions",
    "description": "Bulk upgrade agents",
    "method": "POST",
    "path": "/api/fleet/agents/bulk_upgrade",
    "namespaceFile": "elastic-agent-actions"
  },
  {
    "name": "get-fleet-agent-download-sources",
    "namespace": "elastic-agent-binary-download-sources",
    "description": "Get agent binary download sources",
    "method": "GET",
    "path": "/api/fleet/agent_download_sources",
    "namespaceFile": "elastic-agent-binary-download-sources"
  },
  {
    "name": "post-fleet-agent-download-sources",
    "namespace": "elastic-agent-binary-download-sources",
    "description": "Create an agent binary download source",
    "method": "POST",
    "path": "/api/fleet/agent_download_sources",
    "namespaceFile": "elastic-agent-binary-download-sources"
  },
  {
    "name": "delete-fleet-agent-download-sources-sourceid",
    "namespace": "elastic-agent-binary-download-sources",
    "description": "Delete an agent binary download source",
    "method": "DELETE",
    "path": "/api/fleet/agent_download_sources/{sourceId}",
    "namespaceFile": "elastic-agent-binary-download-sources"
  },
  {
    "name": "get-fleet-agent-download-sources-sourceid",
    "namespace": "elastic-agent-binary-download-sources",
    "description": "Get an agent binary download source",
    "method": "GET",
    "path": "/api/fleet/agent_download_sources/{sourceId}",
    "namespaceFile": "elastic-agent-binary-download-sources"
  },
  {
    "name": "put-fleet-agent-download-sources-sourceid",
    "namespace": "elastic-agent-binary-download-sources",
    "description": "Update an agent binary download source",
    "method": "PUT",
    "path": "/api/fleet/agent_download_sources/{sourceId}",
    "namespaceFile": "elastic-agent-binary-download-sources"
  },
  {
    "name": "get-fleet-agent-policies",
    "namespace": "elastic-agent-policies",
    "description": "Get agent policies",
    "method": "GET",
    "path": "/api/fleet/agent_policies",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "post-fleet-agent-policies",
    "namespace": "elastic-agent-policies",
    "description": "Create an agent policy",
    "method": "POST",
    "path": "/api/fleet/agent_policies",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "post-fleet-agent-policies-bulk-get",
    "namespace": "elastic-agent-policies",
    "description": "Bulk get agent policies",
    "method": "POST",
    "path": "/api/fleet/agent_policies/_bulk_get",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "get-fleet-agent-policies-agentpolicyid",
    "namespace": "elastic-agent-policies",
    "description": "Get an agent policy",
    "method": "GET",
    "path": "/api/fleet/agent_policies/{agentPolicyId}",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "put-fleet-agent-policies-agentpolicyid",
    "namespace": "elastic-agent-policies",
    "description": "Update an agent policy",
    "method": "PUT",
    "path": "/api/fleet/agent_policies/{agentPolicyId}",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "get-fleet-agent-policies-agentpolicyid-auto-upgrade-agents-status",
    "namespace": "elastic-agent-policies",
    "description": "Get auto upgrade agent status",
    "method": "GET",
    "path": "/api/fleet/agent_policies/{agentPolicyId}/auto_upgrade_agents_status",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "post-fleet-agent-policies-agentpolicyid-copy",
    "namespace": "elastic-agent-policies",
    "description": "Copy an agent policy",
    "method": "POST",
    "path": "/api/fleet/agent_policies/{agentPolicyId}/copy",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "get-fleet-agent-policies-agentpolicyid-download",
    "namespace": "elastic-agent-policies",
    "description": "Download an agent policy",
    "method": "GET",
    "path": "/api/fleet/agent_policies/{agentPolicyId}/download",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "get-fleet-agent-policies-agentpolicyid-full",
    "namespace": "elastic-agent-policies",
    "description": "Get a full agent policy",
    "method": "GET",
    "path": "/api/fleet/agent_policies/{agentPolicyId}/full",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "get-fleet-agent-policies-agentpolicyid-outputs",
    "namespace": "elastic-agent-policies",
    "description": "Get outputs for an agent policy",
    "method": "GET",
    "path": "/api/fleet/agent_policies/{agentPolicyId}/outputs",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "post-fleet-agent-policies-delete",
    "namespace": "elastic-agent-policies",
    "description": "Delete an agent policy",
    "method": "POST",
    "path": "/api/fleet/agent_policies/delete",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "post-fleet-agent-policies-outputs",
    "namespace": "elastic-agent-policies",
    "description": "Get outputs for agent policies",
    "method": "POST",
    "path": "/api/fleet/agent_policies/outputs",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "get-fleet-kubernetes",
    "namespace": "elastic-agent-policies",
    "description": "Get a full K8s agent manifest",
    "method": "GET",
    "path": "/api/fleet/kubernetes",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "get-fleet-kubernetes-download",
    "namespace": "elastic-agent-policies",
    "description": "Download an agent manifest",
    "method": "GET",
    "path": "/api/fleet/kubernetes/download",
    "namespaceFile": "elastic-agent-policies"
  },
  {
    "name": "get-fleet-agent-status",
    "namespace": "elastic-agent-status",
    "description": "Get an agent status summary",
    "method": "GET",
    "path": "/api/fleet/agent_status",
    "namespaceFile": "elastic-agent-status"
  },
  {
    "name": "get-fleet-agent-status-data",
    "namespace": "elastic-agents",
    "description": "Get incoming agent data",
    "method": "GET",
    "path": "/api/fleet/agent_status/data",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "get-fleet-agents",
    "namespace": "elastic-agents",
    "description": "Get agents",
    "method": "GET",
    "path": "/api/fleet/agents",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "post-fleet-agents",
    "namespace": "elastic-agents",
    "description": "Get agents by action ids",
    "method": "POST",
    "path": "/api/fleet/agents",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "delete-fleet-agents-agentid",
    "namespace": "elastic-agents",
    "description": "Delete an agent",
    "method": "DELETE",
    "path": "/api/fleet/agents/{agentId}",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "get-fleet-agents-agentid",
    "namespace": "elastic-agents",
    "description": "Get an agent",
    "method": "GET",
    "path": "/api/fleet/agents/{agentId}",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "put-fleet-agents-agentid",
    "namespace": "elastic-agents",
    "description": "Update an agent by ID",
    "method": "PUT",
    "path": "/api/fleet/agents/{agentId}",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "post-fleet-agents-agentid-migrate",
    "namespace": "elastic-agents",
    "description": "Migrate a single agent",
    "method": "POST",
    "path": "/api/fleet/agents/{agentId}/migrate",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "post-fleet-agents-agentid-privilege-level-change",
    "namespace": "elastic-agents",
    "description": "Change agent privilege level",
    "method": "POST",
    "path": "/api/fleet/agents/{agentId}/privilege_level_change",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "get-fleet-agents-agentid-uploads",
    "namespace": "elastic-agents",
    "description": "Get agent uploads",
    "method": "GET",
    "path": "/api/fleet/agents/{agentId}/uploads",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "get-fleet-agents-available-versions",
    "namespace": "elastic-agents",
    "description": "Get available agent versions",
    "method": "GET",
    "path": "/api/fleet/agents/available_versions",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "post-fleet-agents-bulk-migrate",
    "namespace": "elastic-agents",
    "description": "Migrate multiple agents",
    "method": "POST",
    "path": "/api/fleet/agents/bulk_migrate",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "post-fleet-agents-bulk-privilege-level-change",
    "namespace": "elastic-agents",
    "description": "Bulk change agent privilege level",
    "method": "POST",
    "path": "/api/fleet/agents/bulk_privilege_level_change",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "delete-fleet-agents-files-fileid",
    "namespace": "elastic-agents",
    "description": "Delete an uploaded file",
    "method": "DELETE",
    "path": "/api/fleet/agents/files/{fileId}",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "get-fleet-agents-files-fileid-filename",
    "namespace": "elastic-agents",
    "description": "Get an uploaded file",
    "method": "GET",
    "path": "/api/fleet/agents/files/{fileId}/{fileName}",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "get-fleet-agents-setup",
    "namespace": "elastic-agents",
    "description": "Get agent setup info",
    "method": "GET",
    "path": "/api/fleet/agents/setup",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "post-fleet-agents-setup",
    "namespace": "elastic-agents",
    "description": "Initiate agent setup",
    "method": "POST",
    "path": "/api/fleet/agents/setup",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "get-fleet-agents-tags",
    "namespace": "elastic-agents",
    "description": "Get agent tags",
    "method": "GET",
    "path": "/api/fleet/agents/tags",
    "namespaceFile": "elastic-agents"
  },
  {
    "name": "post-fleet-epm-bulk-assets",
    "namespace": "elastic-package-manager-epm",
    "description": "Bulk get assets",
    "method": "POST",
    "path": "/api/fleet/epm/bulk_assets",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-categories",
    "namespace": "elastic-package-manager-epm",
    "description": "Get package categories",
    "method": "GET",
    "path": "/api/fleet/epm/categories",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-custom-integrations",
    "namespace": "elastic-package-manager-epm",
    "description": "Create a custom integration",
    "method": "POST",
    "path": "/api/fleet/epm/custom_integrations",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "put-fleet-epm-custom-integrations-pkgname",
    "namespace": "elastic-package-manager-epm",
    "description": "Update a custom integration",
    "method": "PUT",
    "path": "/api/fleet/epm/custom_integrations/{pkgName}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages",
    "namespace": "elastic-package-manager-epm",
    "description": "Get packages",
    "method": "GET",
    "path": "/api/fleet/epm/packages",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages",
    "namespace": "elastic-package-manager-epm",
    "description": "Install a package by upload",
    "method": "POST",
    "path": "/api/fleet/epm/packages",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-bulk",
    "namespace": "elastic-package-manager-epm",
    "description": "Bulk install packages",
    "method": "POST",
    "path": "/api/fleet/epm/packages/_bulk",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-bulk-rollback",
    "namespace": "elastic-package-manager-epm",
    "description": "Bulk rollback packages",
    "method": "POST",
    "path": "/api/fleet/epm/packages/_bulk_rollback",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-bulk-rollback-taskid",
    "namespace": "elastic-package-manager-epm",
    "description": "Get Bulk rollback packages details",
    "method": "GET",
    "path": "/api/fleet/epm/packages/_bulk_rollback/{taskId}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-bulk-uninstall",
    "namespace": "elastic-package-manager-epm",
    "description": "Bulk uninstall packages",
    "method": "POST",
    "path": "/api/fleet/epm/packages/_bulk_uninstall",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-bulk-uninstall-taskid",
    "namespace": "elastic-package-manager-epm",
    "description": "Get Bulk uninstall packages details",
    "method": "GET",
    "path": "/api/fleet/epm/packages/_bulk_uninstall/{taskId}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-bulk-upgrade",
    "namespace": "elastic-package-manager-epm",
    "description": "Bulk upgrade packages",
    "method": "POST",
    "path": "/api/fleet/epm/packages/_bulk_upgrade",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-bulk-upgrade-taskid",
    "namespace": "elastic-package-manager-epm",
    "description": "Get Bulk upgrade packages details",
    "method": "GET",
    "path": "/api/fleet/epm/packages/_bulk_upgrade/{taskId}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "delete-fleet-epm-packages-pkgname",
    "namespace": "elastic-package-manager-epm",
    "description": "Delete a package",
    "method": "DELETE",
    "path": "/api/fleet/epm/packages/{pkgName}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-pkgname",
    "namespace": "elastic-package-manager-epm",
    "description": "Get a package",
    "method": "GET",
    "path": "/api/fleet/epm/packages/{pkgName}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-pkgname",
    "namespace": "elastic-package-manager-epm",
    "description": "Install a package from the registry",
    "method": "POST",
    "path": "/api/fleet/epm/packages/{pkgName}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "put-fleet-epm-packages-pkgname",
    "namespace": "elastic-package-manager-epm",
    "description": "Update package settings",
    "method": "PUT",
    "path": "/api/fleet/epm/packages/{pkgName}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "delete-fleet-epm-packages-pkgname-pkgversion",
    "namespace": "elastic-package-manager-epm",
    "description": "Delete a package",
    "method": "DELETE",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-pkgname-pkgversion",
    "namespace": "elastic-package-manager-epm",
    "description": "Get a package",
    "method": "GET",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-pkgname-pkgversion",
    "namespace": "elastic-package-manager-epm",
    "description": "Install a package from the registry",
    "method": "POST",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "put-fleet-epm-packages-pkgname-pkgversion",
    "namespace": "elastic-package-manager-epm",
    "description": "Update package settings",
    "method": "PUT",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-pkgname-pkgversion-filepath",
    "namespace": "elastic-package-manager-epm",
    "description": "Get a package file",
    "method": "GET",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}/{filePath}",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "delete-fleet-epm-packages-pkgname-pkgversion-datastream-assets",
    "namespace": "elastic-package-manager-epm",
    "description": "Delete assets for an input package",
    "method": "DELETE",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}/datastream_assets",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "delete-fleet-epm-packages-pkgname-pkgversion-kibana-assets",
    "namespace": "elastic-package-manager-epm",
    "description": "Delete Kibana assets for a package",
    "method": "DELETE",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-pkgname-pkgversion-kibana-assets",
    "namespace": "elastic-package-manager-epm",
    "description": "Install Kibana assets for a package",
    "method": "POST",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}/kibana_assets",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-pkgname-pkgversion-rule-assets",
    "namespace": "elastic-package-manager-epm",
    "description": "Install Kibana alert rule for a package",
    "method": "POST",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}/rule_assets",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-pkgname-pkgversion-transforms-authorize",
    "namespace": "elastic-package-manager-epm",
    "description": "Authorize transforms",
    "method": "POST",
    "path": "/api/fleet/epm/packages/{pkgName}/{pkgVersion}/transforms/authorize",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-pkgname-review-upgrade",
    "namespace": "elastic-package-manager-epm",
    "description": "Review a pending policy upgrade for a package with deprecations",
    "method": "POST",
    "path": "/api/fleet/epm/packages/{pkgName}/review_upgrade",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-epm-packages-pkgname-rollback",
    "namespace": "elastic-package-manager-epm",
    "description": "Rollback a package to previous version",
    "method": "POST",
    "path": "/api/fleet/epm/packages/{pkgName}/rollback",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-pkgname-stats",
    "namespace": "elastic-package-manager-epm",
    "description": "Get package stats",
    "method": "GET",
    "path": "/api/fleet/epm/packages/{pkgName}/stats",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-installed",
    "namespace": "elastic-package-manager-epm",
    "description": "Get installed packages",
    "method": "GET",
    "path": "/api/fleet/epm/packages/installed",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-packages-limited",
    "namespace": "elastic-package-manager-epm",
    "description": "Get a limited package list",
    "method": "GET",
    "path": "/api/fleet/epm/packages/limited",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-templates-pkgname-pkgversion-inputs",
    "namespace": "elastic-package-manager-epm",
    "description": "Get an inputs template",
    "method": "GET",
    "path": "/api/fleet/epm/templates/{pkgName}/{pkgVersion}/inputs",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "get-fleet-epm-verification-key-id",
    "namespace": "elastic-package-manager-epm",
    "description": "Get a package signature verification key ID",
    "method": "GET",
    "path": "/api/fleet/epm/verification_key_id",
    "namespaceFile": "elastic-package-manager-epm"
  },
  {
    "name": "post-fleet-agentless-policies",
    "namespace": "fleet-agentless-policies",
    "description": "Create an agentless policy",
    "method": "POST",
    "path": "/api/fleet/agentless_policies",
    "namespaceFile": "fleet-agentless-policies"
  },
  {
    "name": "delete-fleet-agentless-policies-policyid",
    "namespace": "fleet-agentless-policies",
    "description": "Delete an agentless policy",
    "method": "DELETE",
    "path": "/api/fleet/agentless_policies/{policyId}",
    "namespaceFile": "fleet-agentless-policies"
  },
  {
    "name": "get-fleet-cloud-connectors",
    "namespace": "fleet-cloud-connectors",
    "description": "Get cloud connectors",
    "method": "GET",
    "path": "/api/fleet/cloud_connectors",
    "namespaceFile": "fleet-cloud-connectors"
  },
  {
    "name": "post-fleet-cloud-connectors",
    "namespace": "fleet-cloud-connectors",
    "description": "Create cloud connector",
    "method": "POST",
    "path": "/api/fleet/cloud_connectors",
    "namespaceFile": "fleet-cloud-connectors"
  },
  {
    "name": "delete-fleet-cloud-connectors-cloudconnectorid",
    "namespace": "fleet-cloud-connectors",
    "description": "Delete cloud connector (supports force deletion)",
    "method": "DELETE",
    "path": "/api/fleet/cloud_connectors/{cloudConnectorId}",
    "namespaceFile": "fleet-cloud-connectors"
  },
  {
    "name": "get-fleet-cloud-connectors-cloudconnectorid",
    "namespace": "fleet-cloud-connectors",
    "description": "Get cloud connector",
    "method": "GET",
    "path": "/api/fleet/cloud_connectors/{cloudConnectorId}",
    "namespaceFile": "fleet-cloud-connectors"
  },
  {
    "name": "put-fleet-cloud-connectors-cloudconnectorid",
    "namespace": "fleet-cloud-connectors",
    "description": "Update cloud connector",
    "method": "PUT",
    "path": "/api/fleet/cloud_connectors/{cloudConnectorId}",
    "namespaceFile": "fleet-cloud-connectors"
  },
  {
    "name": "get-fleet-cloud-connectors-cloudconnectorid-usage",
    "namespace": "fleet-cloud-connectors",
    "description": "Get cloud connector usage (package policies using the connector)",
    "method": "GET",
    "path": "/api/fleet/cloud_connectors/{cloudConnectorId}/usage",
    "namespaceFile": "fleet-cloud-connectors"
  },
  {
    "name": "get-fleet-enrollment-api-keys",
    "namespace": "fleet-enrollment-api-keys",
    "description": "Get enrollment API keys",
    "method": "GET",
    "path": "/api/fleet/enrollment_api_keys",
    "namespaceFile": "fleet-enrollment-api-keys"
  },
  {
    "name": "post-fleet-enrollment-api-keys",
    "namespace": "fleet-enrollment-api-keys",
    "description": "Create an enrollment API key",
    "method": "POST",
    "path": "/api/fleet/enrollment_api_keys",
    "namespaceFile": "fleet-enrollment-api-keys"
  },
  {
    "name": "delete-fleet-enrollment-api-keys-keyid",
    "namespace": "fleet-enrollment-api-keys",
    "description": "Revoke an enrollment API key",
    "method": "DELETE",
    "path": "/api/fleet/enrollment_api_keys/{keyId}",
    "namespaceFile": "fleet-enrollment-api-keys"
  },
  {
    "name": "get-fleet-enrollment-api-keys-keyid",
    "namespace": "fleet-enrollment-api-keys",
    "description": "Get an enrollment API key",
    "method": "GET",
    "path": "/api/fleet/enrollment_api_keys/{keyId}",
    "namespaceFile": "fleet-enrollment-api-keys"
  },
  {
    "name": "get-fleet-check-permissions",
    "namespace": "fleet-internals",
    "description": "Check permissions",
    "method": "GET",
    "path": "/api/fleet/check-permissions",
    "namespaceFile": "fleet-internals"
  },
  {
    "name": "post-fleet-health-check",
    "namespace": "fleet-internals",
    "description": "Check Fleet Server health",
    "method": "POST",
    "path": "/api/fleet/health_check",
    "namespaceFile": "fleet-internals"
  },
  {
    "name": "get-fleet-settings",
    "namespace": "fleet-internals",
    "description": "Get settings",
    "method": "GET",
    "path": "/api/fleet/settings",
    "namespaceFile": "fleet-internals"
  },
  {
    "name": "put-fleet-settings",
    "namespace": "fleet-internals",
    "description": "Update settings",
    "method": "PUT",
    "path": "/api/fleet/settings",
    "namespaceFile": "fleet-internals"
  },
  {
    "name": "post-fleet-setup",
    "namespace": "fleet-internals",
    "description": "Initiate Fleet setup",
    "method": "POST",
    "path": "/api/fleet/setup",
    "namespaceFile": "fleet-internals"
  },
  {
    "name": "post-fleet-logstash-api-keys",
    "namespace": "fleet-outputs",
    "description": "Generate a Logstash API key",
    "method": "POST",
    "path": "/api/fleet/logstash_api_keys",
    "namespaceFile": "fleet-outputs"
  },
  {
    "name": "get-fleet-outputs",
    "namespace": "fleet-outputs",
    "description": "Get outputs",
    "method": "GET",
    "path": "/api/fleet/outputs",
    "namespaceFile": "fleet-outputs"
  },
  {
    "name": "post-fleet-outputs",
    "namespace": "fleet-outputs",
    "description": "Create output",
    "method": "POST",
    "path": "/api/fleet/outputs",
    "namespaceFile": "fleet-outputs"
  },
  {
    "name": "delete-fleet-outputs-outputid",
    "namespace": "fleet-outputs",
    "description": "Delete output",
    "method": "DELETE",
    "path": "/api/fleet/outputs/{outputId}",
    "namespaceFile": "fleet-outputs"
  },
  {
    "name": "get-fleet-outputs-outputid",
    "namespace": "fleet-outputs",
    "description": "Get output",
    "method": "GET",
    "path": "/api/fleet/outputs/{outputId}",
    "namespaceFile": "fleet-outputs"
  },
  {
    "name": "put-fleet-outputs-outputid",
    "namespace": "fleet-outputs",
    "description": "Update output",
    "method": "PUT",
    "path": "/api/fleet/outputs/{outputId}",
    "namespaceFile": "fleet-outputs"
  },
  {
    "name": "get-fleet-outputs-outputid-health",
    "namespace": "fleet-outputs",
    "description": "Get the latest output health",
    "method": "GET",
    "path": "/api/fleet/outputs/{outputId}/health",
    "namespaceFile": "fleet-outputs"
  },
  {
    "name": "get-fleet-package-policies",
    "namespace": "fleet-package-policies",
    "description": "Get package policies",
    "method": "GET",
    "path": "/api/fleet/package_policies",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "post-fleet-package-policies",
    "namespace": "fleet-package-policies",
    "description": "Create a package policy",
    "method": "POST",
    "path": "/api/fleet/package_policies",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "post-fleet-package-policies-bulk-get",
    "namespace": "fleet-package-policies",
    "description": "Bulk get package policies",
    "method": "POST",
    "path": "/api/fleet/package_policies/_bulk_get",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "delete-fleet-package-policies-packagepolicyid",
    "namespace": "fleet-package-policies",
    "description": "Delete a package policy",
    "method": "DELETE",
    "path": "/api/fleet/package_policies/{packagePolicyId}",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "get-fleet-package-policies-packagepolicyid",
    "namespace": "fleet-package-policies",
    "description": "Get a package policy",
    "method": "GET",
    "path": "/api/fleet/package_policies/{packagePolicyId}",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "put-fleet-package-policies-packagepolicyid",
    "namespace": "fleet-package-policies",
    "description": "Update a package policy",
    "method": "PUT",
    "path": "/api/fleet/package_policies/{packagePolicyId}",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "post-fleet-package-policies-delete",
    "namespace": "fleet-package-policies",
    "description": "Bulk delete package policies",
    "method": "POST",
    "path": "/api/fleet/package_policies/delete",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "post-fleet-package-policies-upgrade",
    "namespace": "fleet-package-policies",
    "description": "Upgrade a package policy",
    "method": "POST",
    "path": "/api/fleet/package_policies/upgrade",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "post-fleet-package-policies-upgrade-dryrun",
    "namespace": "fleet-package-policies",
    "description": "Dry run a package policy upgrade",
    "method": "POST",
    "path": "/api/fleet/package_policies/upgrade/dryrun",
    "namespaceFile": "fleet-package-policies"
  },
  {
    "name": "get-fleet-proxies",
    "namespace": "fleet-proxies",
    "description": "Get proxies",
    "method": "GET",
    "path": "/api/fleet/proxies",
    "namespaceFile": "fleet-proxies"
  },
  {
    "name": "post-fleet-proxies",
    "namespace": "fleet-proxies",
    "description": "Create a proxy",
    "method": "POST",
    "path": "/api/fleet/proxies",
    "namespaceFile": "fleet-proxies"
  },
  {
    "name": "delete-fleet-proxies-itemid",
    "namespace": "fleet-proxies",
    "description": "Delete a proxy",
    "method": "DELETE",
    "path": "/api/fleet/proxies/{itemId}",
    "namespaceFile": "fleet-proxies"
  },
  {
    "name": "get-fleet-proxies-itemid",
    "namespace": "fleet-proxies",
    "description": "Get a proxy",
    "method": "GET",
    "path": "/api/fleet/proxies/{itemId}",
    "namespaceFile": "fleet-proxies"
  },
  {
    "name": "put-fleet-proxies-itemid",
    "namespace": "fleet-proxies",
    "description": "Update a proxy",
    "method": "PUT",
    "path": "/api/fleet/proxies/{itemId}",
    "namespaceFile": "fleet-proxies"
  },
  {
    "name": "get-fleet-fleet-server-hosts",
    "namespace": "fleet-server-hosts",
    "description": "Get Fleet Server hosts",
    "method": "GET",
    "path": "/api/fleet/fleet_server_hosts",
    "namespaceFile": "fleet-server-hosts"
  },
  {
    "name": "post-fleet-fleet-server-hosts",
    "namespace": "fleet-server-hosts",
    "description": "Create a Fleet Server host",
    "method": "POST",
    "path": "/api/fleet/fleet_server_hosts",
    "namespaceFile": "fleet-server-hosts"
  },
  {
    "name": "delete-fleet-fleet-server-hosts-itemid",
    "namespace": "fleet-server-hosts",
    "description": "Delete a Fleet Server host",
    "method": "DELETE",
    "path": "/api/fleet/fleet_server_hosts/{itemId}",
    "namespaceFile": "fleet-server-hosts"
  },
  {
    "name": "get-fleet-fleet-server-hosts-itemid",
    "namespace": "fleet-server-hosts",
    "description": "Get a Fleet Server host",
    "method": "GET",
    "path": "/api/fleet/fleet_server_hosts/{itemId}",
    "namespaceFile": "fleet-server-hosts"
  },
  {
    "name": "put-fleet-fleet-server-hosts-itemid",
    "namespace": "fleet-server-hosts",
    "description": "Update a Fleet Server host",
    "method": "PUT",
    "path": "/api/fleet/fleet_server_hosts/{itemId}",
    "namespaceFile": "fleet-server-hosts"
  },
  {
    "name": "get-fleet-uninstall-tokens",
    "namespace": "fleet-uninstall-tokens",
    "description": "Get metadata for latest uninstall tokens",
    "method": "GET",
    "path": "/api/fleet/uninstall_tokens",
    "namespaceFile": "fleet-uninstall-tokens"
  },
  {
    "name": "get-fleet-uninstall-tokens-uninstalltokenid",
    "namespace": "fleet-uninstall-tokens",
    "description": "Get a decrypted uninstall token",
    "method": "GET",
    "path": "/api/fleet/uninstall_tokens/{uninstallTokenId}",
    "namespaceFile": "fleet-uninstall-tokens"
  },
  {
    "name": "post-maintenance-window",
    "namespace": "maintenance-window",
    "description": "Create a maintenance window.",
    "method": "POST",
    "path": "/api/maintenance_window",
    "namespaceFile": "maintenance-window"
  },
  {
    "name": "get-maintenance-window-find",
    "namespace": "maintenance-window",
    "description": "Search for a maintenance window.",
    "method": "GET",
    "path": "/api/maintenance_window/_find",
    "namespaceFile": "maintenance-window"
  },
  {
    "name": "delete-maintenance-window-id",
    "namespace": "maintenance-window",
    "description": "Delete a maintenance window.",
    "method": "DELETE",
    "path": "/api/maintenance_window/{id}",
    "namespaceFile": "maintenance-window"
  },
  {
    "name": "get-maintenance-window-id",
    "namespace": "maintenance-window",
    "description": "Get maintenance window details.",
    "method": "GET",
    "path": "/api/maintenance_window/{id}",
    "namespaceFile": "maintenance-window"
  },
  {
    "name": "patch-maintenance-window-id",
    "namespace": "maintenance-window",
    "description": "Update a maintenance window.",
    "method": "PATCH",
    "path": "/api/maintenance_window/{id}",
    "namespaceFile": "maintenance-window"
  },
  {
    "name": "post-maintenance-window-id-archive",
    "namespace": "maintenance-window",
    "description": "Archive a maintenance window.",
    "method": "POST",
    "path": "/api/maintenance_window/{id}/_archive",
    "namespaceFile": "maintenance-window"
  },
  {
    "name": "post-maintenance-window-id-unarchive",
    "namespace": "maintenance-window",
    "description": "Unarchive a maintenance window.",
    "method": "POST",
    "path": "/api/maintenance_window/{id}/_unarchive",
    "namespaceFile": "maintenance-window"
  },
  {
    "name": "post-fleet-message-signing-service-rotate-key-pair",
    "namespace": "message-signing-service",
    "description": "Rotate a Fleet message signing key pair",
    "method": "POST",
    "path": "/api/fleet/message_signing_service/rotate_key_pair",
    "namespaceFile": "message-signing-service"
  },
  {
    "name": "get-actions-connector-oauth-callback-script",
    "namespace": "misc",
    "description": "",
    "method": "GET",
    "path": "/api/actions/connector/_oauth_callback_script",
    "namespaceFile": "misc"
  },
  {
    "name": "get-fleet-space-settings",
    "namespace": "misc",
    "description": "Get space settings",
    "method": "GET",
    "path": "/api/fleet/space_settings",
    "namespaceFile": "misc"
  },
  {
    "name": "put-fleet-space-settings",
    "namespace": "misc",
    "description": "Create space settings",
    "method": "PUT",
    "path": "/api/fleet/space_settings",
    "namespaceFile": "misc"
  },
  {
    "name": "post-security-role-query",
    "namespace": "misc",
    "description": "Query roles",
    "method": "POST",
    "path": "/api/security/role/_query",
    "namespaceFile": "misc"
  },
  {
    "name": "ml-sync",
    "namespace": "ml",
    "description": "Sync saved objects in the default space",
    "method": "GET",
    "path": "/api/ml/saved_objects/sync",
    "namespaceFile": "ml"
  },
  {
    "name": "ml-update-jobs-spaces",
    "namespace": "ml",
    "description": "Update jobs spaces",
    "method": "POST",
    "path": "/api/ml/saved_objects/update_jobs_spaces",
    "namespaceFile": "ml"
  },
  {
    "name": "ml-update-trained-models-spaces",
    "namespace": "ml",
    "description": "Update trained models spaces",
    "method": "POST",
    "path": "/api/ml/saved_objects/update_trained_models_spaces",
    "namespaceFile": "ml"
  },
  {
    "name": "observability-ai-assistant-chat-complete",
    "namespace": "observabilityaiassistant",
    "description": "Generate a chat completion",
    "method": "POST",
    "path": "/api/observability_ai_assistant/chat/complete",
    "namespaceFile": "observabilityaiassistant"
  },
  {
    "name": "get-security-role",
    "namespace": "roles",
    "description": "Get all roles",
    "method": "GET",
    "path": "/api/security/role",
    "namespaceFile": "roles"
  },
  {
    "name": "delete-security-role-name",
    "namespace": "roles",
    "description": "Delete a role",
    "method": "DELETE",
    "path": "/api/security/role/{name}",
    "namespaceFile": "roles"
  },
  {
    "name": "get-security-role-name",
    "namespace": "roles",
    "description": "Get a role",
    "method": "GET",
    "path": "/api/security/role/{name}",
    "namespaceFile": "roles"
  },
  {
    "name": "put-security-role-name",
    "namespace": "roles",
    "description": "Create or update a role",
    "method": "PUT",
    "path": "/api/security/role/{name}",
    "namespaceFile": "roles"
  },
  {
    "name": "post-security-roles",
    "namespace": "roles",
    "description": "Create or update roles",
    "method": "POST",
    "path": "/api/security/roles",
    "namespaceFile": "roles"
  },
  {
    "name": "post-saved-objects-export",
    "namespace": "saved-objects",
    "description": "Export saved objects",
    "method": "POST",
    "path": "/api/saved_objects/_export",
    "namespaceFile": "saved-objects"
  },
  {
    "name": "post-saved-objects-import",
    "namespace": "saved-objects",
    "description": "Import saved objects",
    "method": "POST",
    "path": "/api/saved_objects/_import",
    "namespaceFile": "saved-objects"
  },
  {
    "name": "perform-anonymization-fields-bulk-action",
    "namespace": "security-ai-assistant-api",
    "description": "Apply a bulk action to anonymization fields",
    "method": "POST",
    "path": "/api/security_ai_assistant/anonymization_fields/_bulk_action",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "find-anonymization-fields",
    "namespace": "security-ai-assistant-api",
    "description": "Get anonymization fields",
    "method": "GET",
    "path": "/api/security_ai_assistant/anonymization_fields/_find",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "chat-complete",
    "namespace": "security-ai-assistant-api",
    "description": "Create a model response",
    "method": "POST",
    "path": "/api/security_ai_assistant/chat/complete",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "delete-all-conversations",
    "namespace": "security-ai-assistant-api",
    "description": "Delete conversations",
    "method": "DELETE",
    "path": "/api/security_ai_assistant/current_user/conversations",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "create-conversation",
    "namespace": "security-ai-assistant-api",
    "description": "Create a conversation",
    "method": "POST",
    "path": "/api/security_ai_assistant/current_user/conversations",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "find-conversations",
    "namespace": "security-ai-assistant-api",
    "description": "Get conversations",
    "method": "GET",
    "path": "/api/security_ai_assistant/current_user/conversations/_find",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "delete-conversation",
    "namespace": "security-ai-assistant-api",
    "description": "Delete a conversation",
    "method": "DELETE",
    "path": "/api/security_ai_assistant/current_user/conversations/{id}",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "read-conversation",
    "namespace": "security-ai-assistant-api",
    "description": "Get a conversation",
    "method": "GET",
    "path": "/api/security_ai_assistant/current_user/conversations/{id}",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "update-conversation",
    "namespace": "security-ai-assistant-api",
    "description": "Update a conversation",
    "method": "PUT",
    "path": "/api/security_ai_assistant/current_user/conversations/{id}",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "get-knowledge-base",
    "namespace": "security-ai-assistant-api",
    "description": "Read a KnowledgeBase",
    "method": "GET",
    "path": "/api/security_ai_assistant/knowledge_base",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "post-knowledge-base",
    "namespace": "security-ai-assistant-api",
    "description": "Create a KnowledgeBase",
    "method": "POST",
    "path": "/api/security_ai_assistant/knowledge_base",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "read-knowledge-base",
    "namespace": "security-ai-assistant-api",
    "description": "Read a KnowledgeBase for a resource",
    "method": "GET",
    "path": "/api/security_ai_assistant/knowledge_base/{resource}",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "create-knowledge-base",
    "namespace": "security-ai-assistant-api",
    "description": "Create a KnowledgeBase for a resource",
    "method": "POST",
    "path": "/api/security_ai_assistant/knowledge_base/{resource}",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "create-knowledge-base-entry",
    "namespace": "security-ai-assistant-api",
    "description": "Create a Knowledge Base Entry",
    "method": "POST",
    "path": "/api/security_ai_assistant/knowledge_base/entries",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "perform-knowledge-base-entry-bulk-action",
    "namespace": "security-ai-assistant-api",
    "description": "Applies a bulk action to multiple Knowledge Base Entries",
    "method": "POST",
    "path": "/api/security_ai_assistant/knowledge_base/entries/_bulk_action",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "find-knowledge-base-entries",
    "namespace": "security-ai-assistant-api",
    "description": "Finds Knowledge Base Entries that match the given query.",
    "method": "GET",
    "path": "/api/security_ai_assistant/knowledge_base/entries/_find",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "delete-knowledge-base-entry",
    "namespace": "security-ai-assistant-api",
    "description": "Deletes a single Knowledge Base Entry using the `id` field",
    "method": "DELETE",
    "path": "/api/security_ai_assistant/knowledge_base/entries/{id}",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "read-knowledge-base-entry",
    "namespace": "security-ai-assistant-api",
    "description": "Read a Knowledge Base Entry",
    "method": "GET",
    "path": "/api/security_ai_assistant/knowledge_base/entries/{id}",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "update-knowledge-base-entry",
    "namespace": "security-ai-assistant-api",
    "description": "Update a Knowledge Base Entry",
    "method": "PUT",
    "path": "/api/security_ai_assistant/knowledge_base/entries/{id}",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "perform-prompts-bulk-action",
    "namespace": "security-ai-assistant-api",
    "description": "Apply a bulk action to prompts",
    "method": "POST",
    "path": "/api/security_ai_assistant/prompts/_bulk_action",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "find-prompts",
    "namespace": "security-ai-assistant-api",
    "description": "Get prompts",
    "method": "GET",
    "path": "/api/security_ai_assistant/prompts/_find",
    "namespaceFile": "security-ai-assistant-api"
  },
  {
    "name": "post-attack-discovery-bulk",
    "namespace": "security-attack-discovery-api",
    "description": "Bulk update Attack discoveries",
    "method": "POST",
    "path": "/api/attack_discovery/_bulk",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "attack-discovery-find",
    "namespace": "security-attack-discovery-api",
    "description": "Find Attack discoveries that match the search criteria",
    "method": "GET",
    "path": "/api/attack_discovery/_find",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "post-attack-discovery-generate",
    "namespace": "security-attack-discovery-api",
    "description": "Generate attack discoveries from alerts",
    "method": "POST",
    "path": "/api/attack_discovery/_generate",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "get-attack-discovery-generations",
    "namespace": "security-attack-discovery-api",
    "description": "Get the latest attack discovery generations metadata for the current user",
    "method": "GET",
    "path": "/api/attack_discovery/generations",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "get-attack-discovery-generation",
    "namespace": "security-attack-discovery-api",
    "description": "Get a single Attack discovery generation, including its discoveries and (optional) generation metadata",
    "method": "GET",
    "path": "/api/attack_discovery/generations/{execution_uuid}",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "post-attack-discovery-generations-dismiss",
    "namespace": "security-attack-discovery-api",
    "description": "Dismiss an attack discovery generation",
    "method": "POST",
    "path": "/api/attack_discovery/generations/{execution_uuid}/_dismiss",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "create-attack-discovery-schedules",
    "namespace": "security-attack-discovery-api",
    "description": "Create Attack discovery schedule",
    "method": "POST",
    "path": "/api/attack_discovery/schedules",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "find-attack-discovery-schedules",
    "namespace": "security-attack-discovery-api",
    "description": "Finds Attack discovery schedules that match the search criteria",
    "method": "GET",
    "path": "/api/attack_discovery/schedules/_find",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "delete-attack-discovery-schedules",
    "namespace": "security-attack-discovery-api",
    "description": "Delete Attack discovery schedule",
    "method": "DELETE",
    "path": "/api/attack_discovery/schedules/{id}",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "get-attack-discovery-schedules",
    "namespace": "security-attack-discovery-api",
    "description": "Get Attack discovery schedule by ID",
    "method": "GET",
    "path": "/api/attack_discovery/schedules/{id}",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "update-attack-discovery-schedules",
    "namespace": "security-attack-discovery-api",
    "description": "Update Attack discovery schedule",
    "method": "PUT",
    "path": "/api/attack_discovery/schedules/{id}",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "disable-attack-discovery-schedules",
    "namespace": "security-attack-discovery-api",
    "description": "Disable Attack discovery schedule",
    "method": "POST",
    "path": "/api/attack_discovery/schedules/{id}/_disable",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "enable-attack-discovery-schedules",
    "namespace": "security-attack-discovery-api",
    "description": "Enable Attack discovery schedule",
    "method": "POST",
    "path": "/api/attack_discovery/schedules/{id}/_enable",
    "namespaceFile": "security-attack-discovery-api"
  },
  {
    "name": "read-privileges",
    "namespace": "security-detections-api",
    "description": "Returns user privileges for the Kibana space",
    "method": "GET",
    "path": "/api/detection_engine/privileges",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "delete-rule",
    "namespace": "security-detections-api",
    "description": "Delete a detection rule",
    "method": "DELETE",
    "path": "/api/detection_engine/rules",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "read-rule",
    "namespace": "security-detections-api",
    "description": "Retrieve a detection rule",
    "method": "GET",
    "path": "/api/detection_engine/rules",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "patch-rule",
    "namespace": "security-detections-api",
    "description": "Patch a detection rule",
    "method": "PATCH",
    "path": "/api/detection_engine/rules",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "create-rule",
    "namespace": "security-detections-api",
    "description": "Create a detection rule",
    "method": "POST",
    "path": "/api/detection_engine/rules",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "update-rule",
    "namespace": "security-detections-api",
    "description": "Update a detection rule",
    "method": "PUT",
    "path": "/api/detection_engine/rules",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "perform-rules-bulk-action",
    "namespace": "security-detections-api",
    "description": "Apply a bulk action to detection rules",
    "method": "POST",
    "path": "/api/detection_engine/rules/_bulk_action",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "export-rules",
    "namespace": "security-detections-api",
    "description": "Export detection rules",
    "method": "POST",
    "path": "/api/detection_engine/rules/_export",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "find-rules",
    "namespace": "security-detections-api",
    "description": "List all detection rules",
    "method": "GET",
    "path": "/api/detection_engine/rules/_find",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "import-rules",
    "namespace": "security-detections-api",
    "description": "Import detection rules",
    "method": "POST",
    "path": "/api/detection_engine/rules/_import",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "rule-preview",
    "namespace": "security-detections-api",
    "description": "Preview rule alerts generated on specified time range",
    "method": "POST",
    "path": "/api/detection_engine/rules/preview",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "set-alert-assignees",
    "namespace": "security-detections-api",
    "description": "Assign and unassign users from detection alerts",
    "method": "POST",
    "path": "/api/detection_engine/signals/assignees",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "search-alerts",
    "namespace": "security-detections-api",
    "description": "Find and/or aggregate detection alerts",
    "method": "POST",
    "path": "/api/detection_engine/signals/search",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "set-alerts-status",
    "namespace": "security-detections-api",
    "description": "Set a detection alert status",
    "method": "POST",
    "path": "/api/detection_engine/signals/status",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "set-alert-tags",
    "namespace": "security-detections-api",
    "description": "Add and remove detection alert tags",
    "method": "POST",
    "path": "/api/detection_engine/signals/tags",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "read-tags",
    "namespace": "security-detections-api",
    "description": "List all detection rule tags",
    "method": "GET",
    "path": "/api/detection_engine/tags",
    "namespaceFile": "security-detections-api"
  },
  {
    "name": "create-endpoint-list",
    "namespace": "security-endpoint-exceptions-api",
    "description": "Create an Elastic Endpoint rule exception list",
    "method": "POST",
    "path": "/api/endpoint_list",
    "namespaceFile": "security-endpoint-exceptions-api"
  },
  {
    "name": "delete-endpoint-list-item",
    "namespace": "security-endpoint-exceptions-api",
    "description": "Delete an Elastic Endpoint exception list item",
    "method": "DELETE",
    "path": "/api/endpoint_list/items",
    "namespaceFile": "security-endpoint-exceptions-api"
  },
  {
    "name": "read-endpoint-list-item",
    "namespace": "security-endpoint-exceptions-api",
    "description": "Get an Elastic Endpoint rule exception list item",
    "method": "GET",
    "path": "/api/endpoint_list/items",
    "namespaceFile": "security-endpoint-exceptions-api"
  },
  {
    "name": "create-endpoint-list-item",
    "namespace": "security-endpoint-exceptions-api",
    "description": "Create an Elastic Endpoint rule exception list item",
    "method": "POST",
    "path": "/api/endpoint_list/items",
    "namespaceFile": "security-endpoint-exceptions-api"
  },
  {
    "name": "update-endpoint-list-item",
    "namespace": "security-endpoint-exceptions-api",
    "description": "Update an Elastic Endpoint rule exception list item",
    "method": "PUT",
    "path": "/api/endpoint_list/items",
    "namespaceFile": "security-endpoint-exceptions-api"
  },
  {
    "name": "find-endpoint-list-items",
    "namespace": "security-endpoint-exceptions-api",
    "description": "Get Elastic Endpoint exception list items",
    "method": "GET",
    "path": "/api/endpoint_list/items/_find",
    "namespaceFile": "security-endpoint-exceptions-api"
  },
  {
    "name": "endpoint-get-actions-list",
    "namespace": "security-endpoint-management-api",
    "description": "Get response actions",
    "method": "GET",
    "path": "/api/endpoint/action",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-get-actions-status",
    "namespace": "security-endpoint-management-api",
    "description": "Get response actions status",
    "method": "GET",
    "path": "/api/endpoint/action_status",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-get-actions-details",
    "namespace": "security-endpoint-management-api",
    "description": "Get action details",
    "method": "GET",
    "path": "/api/endpoint/action/{action_id}",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-file-info",
    "namespace": "security-endpoint-management-api",
    "description": "Get file information",
    "method": "GET",
    "path": "/api/endpoint/action/{action_id}/file/{file_id}",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-file-download",
    "namespace": "security-endpoint-management-api",
    "description": "Download a file",
    "method": "GET",
    "path": "/api/endpoint/action/{action_id}/file/{file_id}/download",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "cancel-action",
    "namespace": "security-endpoint-management-api",
    "description": "Cancel a response action",
    "method": "POST",
    "path": "/api/endpoint/action/cancel",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-execute-action",
    "namespace": "security-endpoint-management-api",
    "description": "Run a command",
    "method": "POST",
    "path": "/api/endpoint/action/execute",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-get-file-action",
    "namespace": "security-endpoint-management-api",
    "description": "Get a file",
    "method": "POST",
    "path": "/api/endpoint/action/get_file",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-isolate-action",
    "namespace": "security-endpoint-management-api",
    "description": "Isolate an endpoint",
    "method": "POST",
    "path": "/api/endpoint/action/isolate",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-kill-process-action",
    "namespace": "security-endpoint-management-api",
    "description": "Terminate a process",
    "method": "POST",
    "path": "/api/endpoint/action/kill_process",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-generate-memory-dump",
    "namespace": "security-endpoint-management-api",
    "description": "Generate a memory dump from the host machine",
    "method": "POST",
    "path": "/api/endpoint/action/memory_dump",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-get-processes-action",
    "namespace": "security-endpoint-management-api",
    "description": "Get running processes",
    "method": "POST",
    "path": "/api/endpoint/action/running_procs",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "run-script-action",
    "namespace": "security-endpoint-management-api",
    "description": "Run a script",
    "method": "POST",
    "path": "/api/endpoint/action/runscript",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-scan-action",
    "namespace": "security-endpoint-management-api",
    "description": "Scan a file or directory",
    "method": "POST",
    "path": "/api/endpoint/action/scan",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-get-actions-state",
    "namespace": "security-endpoint-management-api",
    "description": "Get actions state",
    "method": "GET",
    "path": "/api/endpoint/action/state",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-suspend-process-action",
    "namespace": "security-endpoint-management-api",
    "description": "Suspend a process",
    "method": "POST",
    "path": "/api/endpoint/action/suspend_process",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-unisolate-action",
    "namespace": "security-endpoint-management-api",
    "description": "Release an isolated endpoint",
    "method": "POST",
    "path": "/api/endpoint/action/unisolate",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "endpoint-upload-action",
    "namespace": "security-endpoint-management-api",
    "description": "Upload a file",
    "method": "POST",
    "path": "/api/endpoint/action/upload",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "get-endpoint-metadata-list",
    "namespace": "security-endpoint-management-api",
    "description": "Get a metadata list",
    "method": "GET",
    "path": "/api/endpoint/metadata",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "get-endpoint-metadata",
    "namespace": "security-endpoint-management-api",
    "description": "Get metadata",
    "method": "GET",
    "path": "/api/endpoint/metadata/{id}",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "get-policy-response",
    "namespace": "security-endpoint-management-api",
    "description": "Get a policy response",
    "method": "GET",
    "path": "/api/endpoint/policy_response",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "get-protection-updates-note",
    "namespace": "security-endpoint-management-api",
    "description": "Get a protection updates note",
    "method": "GET",
    "path": "/api/endpoint/protection_updates_note/{package_policy_id}",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "create-update-protection-updates-note",
    "namespace": "security-endpoint-management-api",
    "description": "Create or update a protection updates note",
    "method": "POST",
    "path": "/api/endpoint/protection_updates_note/{package_policy_id}",
    "namespaceFile": "security-endpoint-management-api"
  },
  {
    "name": "delete-asset-criticality-record",
    "namespace": "security-entity-analytics-api",
    "description": "Delete an asset criticality record",
    "method": "DELETE",
    "path": "/api/asset_criticality",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "get-asset-criticality-record",
    "namespace": "security-entity-analytics-api",
    "description": "Get an asset criticality record",
    "method": "GET",
    "path": "/api/asset_criticality",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "create-asset-criticality-record",
    "namespace": "security-entity-analytics-api",
    "description": "Upsert an asset criticality record",
    "method": "POST",
    "path": "/api/asset_criticality",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "bulk-upsert-asset-criticality-records",
    "namespace": "security-entity-analytics-api",
    "description": "Bulk upsert asset criticality records",
    "method": "POST",
    "path": "/api/asset_criticality/bulk",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "find-asset-criticality-records",
    "namespace": "security-entity-analytics-api",
    "description": "List asset criticality records",
    "method": "GET",
    "path": "/api/asset_criticality/list",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "delete-monitoring-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Delete the Privilege Monitoring Engine",
    "method": "DELETE",
    "path": "/api/entity_analytics/monitoring/engine/delete",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "disable-monitoring-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Disable the Privilege Monitoring Engine",
    "method": "POST",
    "path": "/api/entity_analytics/monitoring/engine/disable",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "init-monitoring-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Initialize the Privilege Monitoring Engine",
    "method": "POST",
    "path": "/api/entity_analytics/monitoring/engine/init",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "schedule-monitoring-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Schedule the Privilege Monitoring Engine",
    "method": "POST",
    "path": "/api/entity_analytics/monitoring/engine/schedule_now",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "priv-mon-health",
    "namespace": "security-entity-analytics-api",
    "description": "Health check on Privilege Monitoring",
    "method": "GET",
    "path": "/api/entity_analytics/monitoring/privileges/health",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "priv-mon-privileges",
    "namespace": "security-entity-analytics-api",
    "description": "Run a privileges check on Privilege Monitoring",
    "method": "GET",
    "path": "/api/entity_analytics/monitoring/privileges/privileges",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "create-priv-mon-user",
    "namespace": "security-entity-analytics-api",
    "description": "Create a new monitored user",
    "method": "POST",
    "path": "/api/entity_analytics/monitoring/users",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "privmon-bulk-upload-users-c-s-v",
    "namespace": "security-entity-analytics-api",
    "description": "Upsert multiple monitored users via CSV upload",
    "method": "POST",
    "path": "/api/entity_analytics/monitoring/users/_csv",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "delete-priv-mon-user",
    "namespace": "security-entity-analytics-api",
    "description": "Delete a monitored user",
    "method": "DELETE",
    "path": "/api/entity_analytics/monitoring/users/{id}",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "update-priv-mon-user",
    "namespace": "security-entity-analytics-api",
    "description": "Update a monitored user",
    "method": "PUT",
    "path": "/api/entity_analytics/monitoring/users/{id}",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "list-priv-mon-users",
    "namespace": "security-entity-analytics-api",
    "description": "List all monitored users",
    "method": "GET",
    "path": "/api/entity_analytics/monitoring/users/list",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "install-privileged-access-detection-package",
    "namespace": "security-entity-analytics-api",
    "description": "Installs the privileged access detection package for the Entity Analytics privileged user monitoring experience",
    "method": "POST",
    "path": "/api/entity_analytics/privileged_user_monitoring/pad/install",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "get-privileged-access-detection-package-status",
    "namespace": "security-entity-analytics-api",
    "description": "Gets the status of the privileged access detection package for the Entity Analytics privileged user monitoring experience",
    "method": "GET",
    "path": "/api/entity_analytics/privileged_user_monitoring/pad/status",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "create-watchlist",
    "namespace": "security-entity-analytics-api",
    "description": "Create a new watchlist",
    "method": "POST",
    "path": "/api/entity_analytics/watchlists",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "get-watchlist",
    "namespace": "security-entity-analytics-api",
    "description": "Get a watchlist by ID",
    "method": "GET",
    "path": "/api/entity_analytics/watchlists/{id}",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "update-watchlist",
    "namespace": "security-entity-analytics-api",
    "description": "Update an existing watchlist",
    "method": "PUT",
    "path": "/api/entity_analytics/watchlists/{id}",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "list-watchlists",
    "namespace": "security-entity-analytics-api",
    "description": "List all watchlists",
    "method": "GET",
    "path": "/api/entity_analytics/watchlists/list",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "init-entity-store",
    "namespace": "security-entity-analytics-api",
    "description": "Initialize the Entity Store",
    "method": "POST",
    "path": "/api/entity_store/enable",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "delete-entity-engines",
    "namespace": "security-entity-analytics-api",
    "description": "Delete Entity Engines",
    "method": "DELETE",
    "path": "/api/entity_store/engines",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "list-entity-engines",
    "namespace": "security-entity-analytics-api",
    "description": "List the Entity Engines",
    "method": "GET",
    "path": "/api/entity_store/engines",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "delete-entity-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Delete the Entity Engine",
    "method": "DELETE",
    "path": "/api/entity_store/engines/{entityType}",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "get-entity-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Get an Entity Engine",
    "method": "GET",
    "path": "/api/entity_store/engines/{entityType}",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "init-entity-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Initialize an Entity Engine",
    "method": "POST",
    "path": "/api/entity_store/engines/{entityType}/init",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "start-entity-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Start an Entity Engine",
    "method": "POST",
    "path": "/api/entity_store/engines/{entityType}/start",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "stop-entity-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Stop an Entity Engine",
    "method": "POST",
    "path": "/api/entity_store/engines/{entityType}/stop",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "apply-entity-engine-dataview-indices",
    "namespace": "security-entity-analytics-api",
    "description": "Apply DataView indices to all installed engines",
    "method": "POST",
    "path": "/api/entity_store/engines/apply_dataview_indices",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "delete-single-entity",
    "namespace": "security-entity-analytics-api",
    "description": "Delete an entity in Entity Store",
    "method": "DELETE",
    "path": "/api/entity_store/entities/{entityType}",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "upsert-entity",
    "namespace": "security-entity-analytics-api",
    "description": "Upsert an entity in Entity Store",
    "method": "PUT",
    "path": "/api/entity_store/entities/{entityType}",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "upsert-entities-bulk",
    "namespace": "security-entity-analytics-api",
    "description": "Upsert many entities in Entity Store",
    "method": "PUT",
    "path": "/api/entity_store/entities/bulk",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "list-entities",
    "namespace": "security-entity-analytics-api",
    "description": "List Entity Store Entities",
    "method": "GET",
    "path": "/api/entity_store/entities/list",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "get-entity-store-status",
    "namespace": "security-entity-analytics-api",
    "description": "Get the status of the Entity Store",
    "method": "GET",
    "path": "/api/entity_store/status",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "clean-up-risk-engine",
    "namespace": "security-entity-analytics-api",
    "description": "Cleanup the Risk Engine",
    "method": "DELETE",
    "path": "/api/risk_score/engine/dangerously_delete_data",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "configure-risk-engine-saved-object",
    "namespace": "security-entity-analytics-api",
    "description": "Configure the Risk Engine Saved Object",
    "method": "PATCH",
    "path": "/api/risk_score/engine/saved_object/configure",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "schedule-risk-engine-now",
    "namespace": "security-entity-analytics-api",
    "description": "Run the risk scoring engine",
    "method": "POST",
    "path": "/api/risk_score/engine/schedule_now",
    "namespaceFile": "security-entity-analytics-api"
  },
  {
    "name": "create-rule-exception-list-items",
    "namespace": "security-exceptions-api",
    "description": "Create rule exception items",
    "method": "POST",
    "path": "/api/detection_engine/rules/{id}/exceptions",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "delete-exception-list",
    "namespace": "security-exceptions-api",
    "description": "Delete an exception list",
    "method": "DELETE",
    "path": "/api/exception_lists",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "read-exception-list",
    "namespace": "security-exceptions-api",
    "description": "Get exception list details",
    "method": "GET",
    "path": "/api/exception_lists",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "create-exception-list",
    "namespace": "security-exceptions-api",
    "description": "Create an exception list",
    "method": "POST",
    "path": "/api/exception_lists",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "update-exception-list",
    "namespace": "security-exceptions-api",
    "description": "Update an exception list",
    "method": "PUT",
    "path": "/api/exception_lists",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "duplicate-exception-list",
    "namespace": "security-exceptions-api",
    "description": "Duplicate an exception list",
    "method": "POST",
    "path": "/api/exception_lists/_duplicate",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "export-exception-list",
    "namespace": "security-exceptions-api",
    "description": "Export an exception list",
    "method": "POST",
    "path": "/api/exception_lists/_export",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "find-exception-lists",
    "namespace": "security-exceptions-api",
    "description": "Get exception lists",
    "method": "GET",
    "path": "/api/exception_lists/_find",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "import-exception-list",
    "namespace": "security-exceptions-api",
    "description": "Import an exception list",
    "method": "POST",
    "path": "/api/exception_lists/_import",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "delete-exception-list-item",
    "namespace": "security-exceptions-api",
    "description": "Delete an exception list item",
    "method": "DELETE",
    "path": "/api/exception_lists/items",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "read-exception-list-item",
    "namespace": "security-exceptions-api",
    "description": "Get an exception list item",
    "method": "GET",
    "path": "/api/exception_lists/items",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "create-exception-list-item",
    "namespace": "security-exceptions-api",
    "description": "Create an exception list item",
    "method": "POST",
    "path": "/api/exception_lists/items",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "update-exception-list-item",
    "namespace": "security-exceptions-api",
    "description": "Update an exception list item",
    "method": "PUT",
    "path": "/api/exception_lists/items",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "find-exception-list-items",
    "namespace": "security-exceptions-api",
    "description": "Get exception list items",
    "method": "GET",
    "path": "/api/exception_lists/items/_find",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "read-exception-list-summary",
    "namespace": "security-exceptions-api",
    "description": "Get an exception list summary",
    "method": "GET",
    "path": "/api/exception_lists/summary",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "create-shared-exception-list",
    "namespace": "security-exceptions-api",
    "description": "Create a shared exception list",
    "method": "POST",
    "path": "/api/exceptions/shared",
    "namespaceFile": "security-exceptions-api"
  },
  {
    "name": "delete-list",
    "namespace": "security-lists-api",
    "description": "Delete a value list",
    "method": "DELETE",
    "path": "/api/lists",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "read-list",
    "namespace": "security-lists-api",
    "description": "Get value list details",
    "method": "GET",
    "path": "/api/lists",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "patch-list",
    "namespace": "security-lists-api",
    "description": "Patch a value list",
    "method": "PATCH",
    "path": "/api/lists",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "create-list",
    "namespace": "security-lists-api",
    "description": "Create a value list",
    "method": "POST",
    "path": "/api/lists",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "update-list",
    "namespace": "security-lists-api",
    "description": "Update a value list",
    "method": "PUT",
    "path": "/api/lists",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "find-lists",
    "namespace": "security-lists-api",
    "description": "Get value lists",
    "method": "GET",
    "path": "/api/lists/_find",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "delete-list-index",
    "namespace": "security-lists-api",
    "description": "Delete value list data streams",
    "method": "DELETE",
    "path": "/api/lists/index",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "read-list-index",
    "namespace": "security-lists-api",
    "description": "Get status of value list data streams",
    "method": "GET",
    "path": "/api/lists/index",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "create-list-index",
    "namespace": "security-lists-api",
    "description": "Create list data streams",
    "method": "POST",
    "path": "/api/lists/index",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "delete-list-item",
    "namespace": "security-lists-api",
    "description": "Delete a value list item",
    "method": "DELETE",
    "path": "/api/lists/items",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "read-list-item",
    "namespace": "security-lists-api",
    "description": "Get a value list item",
    "method": "GET",
    "path": "/api/lists/items",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "patch-list-item",
    "namespace": "security-lists-api",
    "description": "Patch a value list item",
    "method": "PATCH",
    "path": "/api/lists/items",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "create-list-item",
    "namespace": "security-lists-api",
    "description": "Create a value list item",
    "method": "POST",
    "path": "/api/lists/items",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "update-list-item",
    "namespace": "security-lists-api",
    "description": "Update a value list item",
    "method": "PUT",
    "path": "/api/lists/items",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "export-list-items",
    "namespace": "security-lists-api",
    "description": "Export value list items",
    "method": "POST",
    "path": "/api/lists/items/_export",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "find-list-items",
    "namespace": "security-lists-api",
    "description": "Get value list items",
    "method": "GET",
    "path": "/api/lists/items/_find",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "import-list-items",
    "namespace": "security-lists-api",
    "description": "Import value list items",
    "method": "POST",
    "path": "/api/lists/items/_import",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "read-list-privileges",
    "namespace": "security-lists-api",
    "description": "Get value list privileges",
    "method": "GET",
    "path": "/api/lists/privileges",
    "namespaceFile": "security-lists-api"
  },
  {
    "name": "osquery-find-live-queries",
    "namespace": "security-osquery-api",
    "description": "Get live queries",
    "method": "GET",
    "path": "/api/osquery/live_queries",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-create-live-query",
    "namespace": "security-osquery-api",
    "description": "Create a live query",
    "method": "POST",
    "path": "/api/osquery/live_queries",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-get-live-query-details",
    "namespace": "security-osquery-api",
    "description": "Get live query details",
    "method": "GET",
    "path": "/api/osquery/live_queries/{id}",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-get-live-query-results",
    "namespace": "security-osquery-api",
    "description": "Get live query results",
    "method": "GET",
    "path": "/api/osquery/live_queries/{id}/results/{actionId}",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-find-packs",
    "namespace": "security-osquery-api",
    "description": "Get packs",
    "method": "GET",
    "path": "/api/osquery/packs",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-create-packs",
    "namespace": "security-osquery-api",
    "description": "Create a pack",
    "method": "POST",
    "path": "/api/osquery/packs",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-delete-packs",
    "namespace": "security-osquery-api",
    "description": "Delete a pack",
    "method": "DELETE",
    "path": "/api/osquery/packs/{id}",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-get-packs-details",
    "namespace": "security-osquery-api",
    "description": "Get pack details",
    "method": "GET",
    "path": "/api/osquery/packs/{id}",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-update-packs",
    "namespace": "security-osquery-api",
    "description": "Update a pack",
    "method": "PUT",
    "path": "/api/osquery/packs/{id}",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-find-saved-queries",
    "namespace": "security-osquery-api",
    "description": "Get saved queries",
    "method": "GET",
    "path": "/api/osquery/saved_queries",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-create-saved-query",
    "namespace": "security-osquery-api",
    "description": "Create a saved query",
    "method": "POST",
    "path": "/api/osquery/saved_queries",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-delete-saved-query",
    "namespace": "security-osquery-api",
    "description": "Delete a saved query",
    "method": "DELETE",
    "path": "/api/osquery/saved_queries/{id}",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-get-saved-query-details",
    "namespace": "security-osquery-api",
    "description": "Get saved query details",
    "method": "GET",
    "path": "/api/osquery/saved_queries/{id}",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "osquery-update-saved-query",
    "namespace": "security-osquery-api",
    "description": "Update a saved query",
    "method": "PUT",
    "path": "/api/osquery/saved_queries/{id}",
    "namespaceFile": "security-osquery-api"
  },
  {
    "name": "delete-note",
    "namespace": "security-timeline-api",
    "description": "Delete a note",
    "method": "DELETE",
    "path": "/api/note",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "get-notes",
    "namespace": "security-timeline-api",
    "description": "Get notes",
    "method": "GET",
    "path": "/api/note",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "persist-note-route",
    "namespace": "security-timeline-api",
    "description": "Add or update a note",
    "method": "PATCH",
    "path": "/api/note",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "persist-pinned-event-route",
    "namespace": "security-timeline-api",
    "description": "Pin/unpin an event",
    "method": "PATCH",
    "path": "/api/pinned_event",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "delete-timelines",
    "namespace": "security-timeline-api",
    "description": "Delete Timelines or Timeline templates",
    "method": "DELETE",
    "path": "/api/timeline",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "get-timeline",
    "namespace": "security-timeline-api",
    "description": "Get Timeline or Timeline template details",
    "method": "GET",
    "path": "/api/timeline",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "patch-timeline",
    "namespace": "security-timeline-api",
    "description": "Update a Timeline",
    "method": "PATCH",
    "path": "/api/timeline",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "create-timelines",
    "namespace": "security-timeline-api",
    "description": "Create a Timeline or Timeline template",
    "method": "POST",
    "path": "/api/timeline",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "copy-timeline",
    "namespace": "security-timeline-api",
    "description": "Copies timeline or timeline template",
    "method": "GET",
    "path": "/api/timeline/_copy",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "get-draft-timelines",
    "namespace": "security-timeline-api",
    "description": "Get draft Timeline or Timeline template details",
    "method": "GET",
    "path": "/api/timeline/_draft",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "clean-draft-timelines",
    "namespace": "security-timeline-api",
    "description": "Create a clean draft Timeline or Timeline template",
    "method": "POST",
    "path": "/api/timeline/_draft",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "export-timelines",
    "namespace": "security-timeline-api",
    "description": "Export Timelines",
    "method": "POST",
    "path": "/api/timeline/_export",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "persist-favorite-route",
    "namespace": "security-timeline-api",
    "description": "Favorite a Timeline or Timeline template",
    "method": "PATCH",
    "path": "/api/timeline/_favorite",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "import-timelines",
    "namespace": "security-timeline-api",
    "description": "Import Timelines",
    "method": "POST",
    "path": "/api/timeline/_import",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "install-prepacked-timelines",
    "namespace": "security-timeline-api",
    "description": "Install prepackaged Timelines",
    "method": "POST",
    "path": "/api/timeline/_prepackaged",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "resolve-timeline",
    "namespace": "security-timeline-api",
    "description": "Get an existing saved Timeline or Timeline template",
    "method": "GET",
    "path": "/api/timeline/resolve",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "get-timelines",
    "namespace": "security-timeline-api",
    "description": "Get Timelines or Timeline templates",
    "method": "GET",
    "path": "/api/timelines",
    "namespaceFile": "security-timeline-api"
  },
  {
    "name": "find-slos-op",
    "namespace": "slo",
    "description": "Get a paginated list of SLOs",
    "method": "GET",
    "path": "/s/{spaceId}/api/observability/slos",
    "namespaceFile": "slo"
  },
  {
    "name": "create-slo-op",
    "namespace": "slo",
    "description": "Create an SLO",
    "method": "POST",
    "path": "/s/{spaceId}/api/observability/slos",
    "namespaceFile": "slo"
  },
  {
    "name": "bulk-delete-op",
    "namespace": "slo",
    "description": "Bulk delete SLO definitions and their associated summary and rollup data.",
    "method": "POST",
    "path": "/s/{spaceId}/api/observability/slos/_bulk_delete",
    "namespaceFile": "slo"
  },
  {
    "name": "bulk-delete-status-op",
    "namespace": "slo",
    "description": "Retrieve the status of the bulk deletion",
    "method": "GET",
    "path": "/s/{spaceId}/api/observability/slos/_bulk_delete/{taskId}",
    "namespaceFile": "slo"
  },
  {
    "name": "delete-rollup-data-op",
    "namespace": "slo",
    "description": "Batch delete rollup and summary data",
    "method": "POST",
    "path": "/s/{spaceId}/api/observability/slos/_bulk_purge_rollup",
    "namespaceFile": "slo"
  },
  {
    "name": "delete-slo-instances-op",
    "namespace": "slo",
    "description": "Batch delete rollup and summary data",
    "method": "POST",
    "path": "/s/{spaceId}/api/observability/slos/_delete_instances",
    "namespaceFile": "slo"
  },
  {
    "name": "delete-slo-op",
    "namespace": "slo",
    "description": "Delete an SLO",
    "method": "DELETE",
    "path": "/s/{spaceId}/api/observability/slos/{sloId}",
    "namespaceFile": "slo"
  },
  {
    "name": "get-slo-op",
    "namespace": "slo",
    "description": "Get an SLO",
    "method": "GET",
    "path": "/s/{spaceId}/api/observability/slos/{sloId}",
    "namespaceFile": "slo"
  },
  {
    "name": "update-slo-op",
    "namespace": "slo",
    "description": "Update an SLO",
    "method": "PUT",
    "path": "/s/{spaceId}/api/observability/slos/{sloId}",
    "namespaceFile": "slo"
  },
  {
    "name": "reset-slo-op",
    "namespace": "slo",
    "description": "Reset an SLO",
    "method": "POST",
    "path": "/s/{spaceId}/api/observability/slos/{sloId}/_reset",
    "namespaceFile": "slo"
  },
  {
    "name": "disable-slo-op",
    "namespace": "slo",
    "description": "Disable an SLO",
    "method": "POST",
    "path": "/s/{spaceId}/api/observability/slos/{sloId}/disable",
    "namespaceFile": "slo"
  },
  {
    "name": "enable-slo-op",
    "namespace": "slo",
    "description": "Enable an SLO",
    "method": "POST",
    "path": "/s/{spaceId}/api/observability/slos/{sloId}/enable",
    "namespaceFile": "slo"
  },
  {
    "name": "get-definitions-op",
    "namespace": "slo",
    "description": "Get the SLO definitions",
    "method": "GET",
    "path": "/s/{spaceId}/internal/observability/slos/_definitions",
    "namespaceFile": "slo"
  },
  {
    "name": "get-spaces-space",
    "namespace": "spaces",
    "description": "Get all spaces",
    "method": "GET",
    "path": "/api/spaces/space",
    "namespaceFile": "spaces"
  },
  {
    "name": "post-spaces-space",
    "namespace": "spaces",
    "description": "Create a space",
    "method": "POST",
    "path": "/api/spaces/space",
    "namespaceFile": "spaces"
  },
  {
    "name": "delete-spaces-space-id",
    "namespace": "spaces",
    "description": "Delete a space",
    "method": "DELETE",
    "path": "/api/spaces/space/{id}",
    "namespaceFile": "spaces"
  },
  {
    "name": "get-spaces-space-id",
    "namespace": "spaces",
    "description": "Get a space",
    "method": "GET",
    "path": "/api/spaces/space/{id}",
    "namespaceFile": "spaces"
  },
  {
    "name": "put-spaces-space-id",
    "namespace": "spaces",
    "description": "Update a space",
    "method": "PUT",
    "path": "/api/spaces/space/{id}",
    "namespaceFile": "spaces"
  },
  {
    "name": "get-streams",
    "namespace": "streams",
    "description": "Get stream list",
    "method": "GET",
    "path": "/api/streams",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-disable",
    "namespace": "streams",
    "description": "Disable streams",
    "method": "POST",
    "path": "/api/streams/_disable",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-enable",
    "namespace": "streams",
    "description": "Enable streams",
    "method": "POST",
    "path": "/api/streams/_enable",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-resync",
    "namespace": "streams",
    "description": "Resync streams",
    "method": "POST",
    "path": "/api/streams/_resync",
    "namespaceFile": "streams"
  },
  {
    "name": "delete-streams-name",
    "namespace": "streams",
    "description": "Delete a stream",
    "method": "DELETE",
    "path": "/api/streams/{name}",
    "namespaceFile": "streams"
  },
  {
    "name": "get-streams-name",
    "namespace": "streams",
    "description": "Get a stream",
    "method": "GET",
    "path": "/api/streams/{name}",
    "namespaceFile": "streams"
  },
  {
    "name": "put-streams-name",
    "namespace": "streams",
    "description": "Create or update a stream",
    "method": "PUT",
    "path": "/api/streams/{name}",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-name-fork",
    "namespace": "streams",
    "description": "Fork a stream",
    "method": "POST",
    "path": "/api/streams/{name}/_fork",
    "namespaceFile": "streams"
  },
  {
    "name": "get-streams-name-ingest",
    "namespace": "streams",
    "description": "Get ingest stream settings",
    "method": "GET",
    "path": "/api/streams/{name}/_ingest",
    "namespaceFile": "streams"
  },
  {
    "name": "put-streams-name-ingest",
    "namespace": "streams",
    "description": "Update ingest stream settings",
    "method": "PUT",
    "path": "/api/streams/{name}/_ingest",
    "namespaceFile": "streams"
  },
  {
    "name": "get-streams-name-query",
    "namespace": "streams",
    "description": "Get query stream settings",
    "method": "GET",
    "path": "/api/streams/{name}/_query",
    "namespaceFile": "streams"
  },
  {
    "name": "put-streams-name-query",
    "namespace": "streams",
    "description": "Upsert query stream settings",
    "method": "PUT",
    "path": "/api/streams/{name}/_query",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-name-content-export",
    "namespace": "streams",
    "description": "Export stream content",
    "method": "POST",
    "path": "/api/streams/{name}/content/export",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-name-content-import",
    "namespace": "streams",
    "description": "Import content into a stream",
    "method": "POST",
    "path": "/api/streams/{name}/content/import",
    "namespaceFile": "streams"
  },
  {
    "name": "get-streams-name-queries",
    "namespace": "streams",
    "description": "Get stream queries",
    "method": "GET",
    "path": "/api/streams/{name}/queries",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-name-queries-bulk",
    "namespace": "streams",
    "description": "Bulk update queries",
    "method": "POST",
    "path": "/api/streams/{name}/queries/_bulk",
    "namespaceFile": "streams"
  },
  {
    "name": "delete-streams-name-queries-queryid",
    "namespace": "streams",
    "description": "Remove a query from a stream",
    "method": "DELETE",
    "path": "/api/streams/{name}/queries/{queryId}",
    "namespaceFile": "streams"
  },
  {
    "name": "put-streams-name-queries-queryid",
    "namespace": "streams",
    "description": "Upsert a query to a stream",
    "method": "PUT",
    "path": "/api/streams/{name}/queries/{queryId}",
    "namespaceFile": "streams"
  },
  {
    "name": "get-streams-name-significant-events",
    "namespace": "streams",
    "description": "Read the significant events",
    "method": "GET",
    "path": "/api/streams/{name}/significant_events",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-name-significant-events-generate",
    "namespace": "streams",
    "description": "Generate significant events",
    "method": "POST",
    "path": "/api/streams/{name}/significant_events/_generate",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-name-significant-events-preview",
    "namespace": "streams",
    "description": "Preview significant events",
    "method": "POST",
    "path": "/api/streams/{name}/significant_events/_preview",
    "namespaceFile": "streams"
  },
  {
    "name": "get-streams-streamname-attachments",
    "namespace": "streams",
    "description": "Get stream attachments",
    "method": "GET",
    "path": "/api/streams/{streamName}/attachments",
    "namespaceFile": "streams"
  },
  {
    "name": "post-streams-streamname-attachments-bulk",
    "namespace": "streams",
    "description": "Bulk update attachments",
    "method": "POST",
    "path": "/api/streams/{streamName}/attachments/_bulk",
    "namespaceFile": "streams"
  },
  {
    "name": "delete-streams-streamname-attachments-attachmenttype-attachmentid",
    "namespace": "streams",
    "description": "Unlink an attachment from a stream",
    "method": "DELETE",
    "path": "/api/streams/{streamName}/attachments/{attachmentType}/{attachmentId}",
    "namespaceFile": "streams"
  },
  {
    "name": "put-streams-streamname-attachments-attachmenttype-attachmentid",
    "namespace": "streams",
    "description": "Link an attachment to a stream",
    "method": "PUT",
    "path": "/api/streams/{streamName}/attachments/{attachmentType}/{attachmentId}",
    "namespaceFile": "streams"
  },
  {
    "name": "get-status",
    "namespace": "system",
    "description": "Get Kibana's current status",
    "method": "GET",
    "path": "/api/status",
    "namespaceFile": "system"
  },
  {
    "name": "task-manager-health",
    "namespace": "task-manager",
    "description": "Get the task manager health",
    "method": "GET",
    "path": "/api/task_manager/_health",
    "namespaceFile": "task-manager"
  },
  {
    "name": "delete-workflows",
    "namespace": "workflows",
    "description": "Bulk delete workflows",
    "method": "DELETE",
    "path": "/api/workflows",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows",
    "namespace": "workflows",
    "description": "Get workflows",
    "method": "GET",
    "path": "/api/workflows",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows",
    "namespace": "workflows",
    "description": "Bulk create workflows",
    "method": "POST",
    "path": "/api/workflows",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-aggs",
    "namespace": "workflows",
    "description": "Get workflow aggregations",
    "method": "GET",
    "path": "/api/workflows/aggs",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-connectors",
    "namespace": "workflows",
    "description": "Get available connectors",
    "method": "GET",
    "path": "/api/workflows/connectors",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-executions-executionid",
    "namespace": "workflows",
    "description": "Get a workflow execution",
    "method": "GET",
    "path": "/api/workflows/executions/{executionId}",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-executions-executionid-cancel",
    "namespace": "workflows",
    "description": "Cancel a workflow execution",
    "method": "POST",
    "path": "/api/workflows/executions/{executionId}/cancel",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-executions-executionid-children",
    "namespace": "workflows",
    "description": "Get child executions",
    "method": "GET",
    "path": "/api/workflows/executions/{executionId}/children",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-executions-executionid-logs",
    "namespace": "workflows",
    "description": "Get execution logs",
    "method": "GET",
    "path": "/api/workflows/executions/{executionId}/logs",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-executions-executionid-resume",
    "namespace": "workflows",
    "description": "Resume a workflow execution",
    "method": "POST",
    "path": "/api/workflows/executions/{executionId}/resume",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-executions-executionid-step-stepexecutionid",
    "namespace": "workflows",
    "description": "Get a step execution",
    "method": "GET",
    "path": "/api/workflows/executions/{executionId}/step/{stepExecutionId}",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-export",
    "namespace": "workflows",
    "description": "Export workflows",
    "method": "POST",
    "path": "/api/workflows/export",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-mget",
    "namespace": "workflows",
    "description": "Get workflows by IDs",
    "method": "POST",
    "path": "/api/workflows/mget",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-schema",
    "namespace": "workflows",
    "description": "Get workflow JSON schema",
    "method": "GET",
    "path": "/api/workflows/schema",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-stats",
    "namespace": "workflows",
    "description": "Get workflow statistics",
    "method": "GET",
    "path": "/api/workflows/stats",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-step-test",
    "namespace": "workflows",
    "description": "Test a workflow step",
    "method": "POST",
    "path": "/api/workflows/step/test",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-test",
    "namespace": "workflows",
    "description": "Test a workflow",
    "method": "POST",
    "path": "/api/workflows/test",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-workflow",
    "namespace": "workflows",
    "description": "Create a workflow",
    "method": "POST",
    "path": "/api/workflows/workflow",
    "namespaceFile": "workflows"
  },
  {
    "name": "delete-workflows-workflow-id",
    "namespace": "workflows",
    "description": "Delete a workflow",
    "method": "DELETE",
    "path": "/api/workflows/workflow/{id}",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-workflow-id",
    "namespace": "workflows",
    "description": "Get a workflow",
    "method": "GET",
    "path": "/api/workflows/workflow/{id}",
    "namespaceFile": "workflows"
  },
  {
    "name": "put-workflows-workflow-id",
    "namespace": "workflows",
    "description": "Update a workflow",
    "method": "PUT",
    "path": "/api/workflows/workflow/{id}",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-workflow-id-clone",
    "namespace": "workflows",
    "description": "Clone a workflow",
    "method": "POST",
    "path": "/api/workflows/workflow/{id}/clone",
    "namespaceFile": "workflows"
  },
  {
    "name": "post-workflows-workflow-id-run",
    "namespace": "workflows",
    "description": "Run a workflow",
    "method": "POST",
    "path": "/api/workflows/workflow/{id}/run",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-workflow-workflowid-executions",
    "namespace": "workflows",
    "description": "Get workflow executions",
    "method": "GET",
    "path": "/api/workflows/workflow/{workflowId}/executions",
    "namespaceFile": "workflows"
  },
  {
    "name": "get-workflows-workflow-workflowid-executions-steps",
    "namespace": "workflows",
    "description": "Get workflow step executions",
    "method": "GET",
    "path": "/api/workflows/workflow/{workflowId}/executions/steps",
    "namespaceFile": "workflows"
  }
]
