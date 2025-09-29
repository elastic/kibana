/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * This file contains Zod schema definitions extracted from the Kibana OpenAPI specification.
 * Generated at: 2025-09-29T08:20:43.312Z
 * Source: Kibana OpenAPI spec via openapi-zod-client (complete schemas)
 *
 * To regenerate: npm run generate:kibana-connectors
 */

import { z } from '@kbn/zod';

// Zodios imports removed for schemas file

// eslint-disable-next-line @typescript-eslint/naming-convention
export const bedrock_config = z
  .object({
    apiUrl: z.string(),
    defaultModel: z.string().optional().default('us.anthropic.claude-3-7-sonnet-20250219-v1:0'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const crowdstrike_config = z.object({ url: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const d3security_config = z.object({ url: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const email_config = z
  .object({
    clientId: z.string().nullish(),
    from: z.string(),
    hasAuth: z.boolean().optional().default(true),
    host: z.string().optional(),
    oauthTokenUrl: z.string().nullish(),
    port: z.number().int().optional(),
    secure: z.boolean().optional(),
    service: z
      .enum(['elastic_cloud', 'exchange_server', 'gmail', 'other', 'outlook365', 'ses'])
      .optional(),
    tenantId: z.string().nullish(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const gemini_config = z
  .object({
    apiUrl: z.string(),
    defaultModel: z.string().optional().default('gemini-2.5-pro'),
    gcpRegion: z.string(),
    gcpProjectID: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const resilient_config = z.object({ apiUrl: z.string(), orgId: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const index_config = z
  .object({
    executionTimeField: z.string().nullish().default(null),
    index: z.string(),
    refresh: z.boolean().optional().default(false),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const jira_config = z.object({ apiUrl: z.string(), projectKey: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const genai_azure_config = z
  .object({ apiProvider: z.literal('Azure OpenAI'), apiUrl: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const genai_openai_config = z
  .object({
    apiProvider: z.literal('OpenAI'),
    apiUrl: z.string(),
    defaultModel: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const genai_openai_other_config = z
  .object({
    apiProvider: z.literal('Other'),
    apiUrl: z.string(),
    defaultModel: z.string(),
    certificateData: z.string().min(1).optional(),
    privateKeyData: z.string().min(1).optional(),
    caData: z.string().min(1).optional(),
    verificationMode: z.enum(['full', 'certificate', 'none']).optional().default('full'),
    headers: z.record(z.string()).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const opsgenie_config = z.object({ apiUrl: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const pagerduty_config = z.object({ apiUrl: z.string().nullable() }).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const sentinelone_config = z.object({ url: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const servicenow_config = z
  .object({
    apiUrl: z.string(),
    clientId: z.string().optional(),
    isOAuth: z.boolean().optional().default(false),
    jwtKeyId: z.string().optional(),
    userIdentifierValue: z.string().optional(),
    usesTableApi: z.boolean().optional().default(true),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const servicenow_itom_config = z
  .object({
    apiUrl: z.string(),
    clientId: z.string().optional(),
    isOAuth: z.boolean().optional().default(false),
    jwtKeyId: z.string().optional(),
    userIdentifierValue: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const slack_api_config = z
  .object({
    allowedChannels: z.array(
      z.object({ id: z.string().min(1), name: z.string().min(1) }).passthrough()
    ),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const swimlane_config = z
  .object({
    apiUrl: z.string(),
    appId: z.string(),
    connectorType: z.enum(['all', 'alerts', 'cases']),
    mappings: z
      .object({
        alertIdConfig: z
          .object({ fieldType: z.string(), id: z.string(), key: z.string(), name: z.string() })
          .passthrough(),
        caseIdConfig: z
          .object({ fieldType: z.string(), id: z.string(), key: z.string(), name: z.string() })
          .passthrough(),
        caseNameConfig: z
          .object({ fieldType: z.string(), id: z.string(), key: z.string(), name: z.string() })
          .passthrough(),
        commentsConfig: z
          .object({ fieldType: z.string(), id: z.string(), key: z.string(), name: z.string() })
          .passthrough(),
        descriptionConfig: z
          .object({ fieldType: z.string(), id: z.string(), key: z.string(), name: z.string() })
          .passthrough(),
        ruleNameConfig: z
          .object({ fieldType: z.string(), id: z.string(), key: z.string(), name: z.string() })
          .passthrough(),
        severityConfig: z
          .object({ fieldType: z.string(), id: z.string(), key: z.string(), name: z.string() })
          .passthrough(),
      })
      .partial()
      .passthrough()
      .optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const thehive_config = z
  .object({ organisation: z.string().optional(), url: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const tines_config = z.object({ url: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const torq_config = z.object({ webhookIntegrationUrl: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const auth_type = z.enum(['webhook-authentication-basic', 'webhook-authentication-ssl']);

export const ca = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const cert_type = z.enum(['ssl-crt-key', 'ssl-pfx']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const has_auth = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const verification_mode = z.enum(['certificate', 'full', 'none']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const webhook_config = z
  .object({
    authType: auth_type.nullable(),
    ca,
    certType: cert_type,
    hasAuth: has_auth.default(true),
    headers: z.object({}).partial().passthrough().nullable(),
    method: z.enum(['post', 'put']).default('post'),
    url: z.string(),
    verificationMode: verification_mode.default('full'),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const cases_webhook_config = z
  .object({
    authType: auth_type.nullish(),
    ca: ca.optional(),
    certType: cert_type.optional(),
    createCommentJson: z.string().optional(),
    createCommentMethod: z.enum(['patch', 'post', 'put']).optional().default('put'),
    createCommentUrl: z.string().optional(),
    createIncidentJson: z.string(),
    createIncidentMethod: z.enum(['patch', 'post', 'put']).optional().default('post'),
    createIncidentResponseKey: z.string(),
    createIncidentUrl: z.string(),
    getIncidentResponseExternalTitleKey: z.string(),
    getIncidentUrl: z.string(),
    hasAuth: has_auth.optional().default(true),
    headers: z.string().optional(),
    updateIncidentJson: z.string(),
    updateIncidentMethod: z.enum(['patch', 'post', 'put']).optional().default('put'),
    updateIncidentUrl: z.string(),
    verificationMode: verification_mode.optional().default('full'),
    viewIncidentUrl: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const xmatters_config = z
  .object({ configUrl: z.string().nullable(), usesBasic: z.boolean().default(true) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const bedrock_secrets = z
  .object({ accessKey: z.string(), secret: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const crowdstrike_secrets = z
  .object({ clientId: z.string(), clientSecret: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const d3security_secrets = z.object({ token: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const email_secrets = z
  .object({ clientSecret: z.string(), password: z.string(), user: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const gemini_secrets = z.object({ credentialsJson: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const resilient_secrets = z
  .object({ apiKeyId: z.string(), apiKeySecret: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const jira_secrets = z.object({ apiToken: z.string(), email: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const defender_secrets = z.object({ clientSecret: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const teams_secrets = z.object({ webhookUrl: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const genai_secrets = z
  .object({
    apiKey: z.string(),
    certificateData: z.string().min(1),
    privateKeyData: z.string().min(1),
    caData: z.string().min(1),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const opsgenie_secrets = z.object({ apiKey: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const pagerduty_secrets = z.object({ routingKey: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const sentinelone_secrets = z.object({ token: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const servicenow_secrets = z
  .object({
    clientSecret: z.string(),
    password: z.string(),
    privateKey: z.string(),
    privateKeyPassword: z.string(),
    username: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const slack_api_secrets = z.object({ token: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const swimlane_secrets = z.object({ apiToken: z.string() }).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const thehive_secrets = z.object({ apiKey: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const tines_secrets = z.object({ email: z.string(), token: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const torq_secrets = z.object({ token: z.string() }).passthrough();

export const crt = z.string();

export const key = z.string();

export const pfx = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const webhook_secrets = z
  .object({ crt, key, pfx, password: z.string(), user: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const cases_webhook_secrets = z
  .object({ crt, key, pfx, password: z.string(), user: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const xmatters_secrets = z
  .object({ password: z.string(), secretsUrl: z.string(), user: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_actions_connector_id_Body = z.object({
  connector_type_id: z.string(),
  name: z.string(),
  config: z
    .union([
      bedrock_config,
      crowdstrike_config,
      d3security_config,
      email_config,
      gemini_config,
      resilient_config,
      index_config,
      jira_config,
      genai_azure_config,
      genai_openai_config,
      genai_openai_other_config,
      opsgenie_config,
      pagerduty_config,
      sentinelone_config,
      servicenow_config,
      servicenow_itom_config,
      slack_api_config,
      swimlane_config,
      thehive_config,
      tines_config,
      torq_config,
      webhook_config,
      cases_webhook_config,
      xmatters_config,
    ])
    .optional()
    .default({}),
  secrets: z
    .union([
      bedrock_secrets,
      crowdstrike_secrets,
      d3security_secrets,
      email_secrets,
      gemini_secrets,
      resilient_secrets,
      jira_secrets,
      defender_secrets,
      teams_secrets,
      genai_secrets,
      opsgenie_secrets,
      pagerduty_secrets,
      sentinelone_secrets,
      servicenow_secrets,
      slack_api_secrets,
      swimlane_secrets,
      thehive_secrets,
      tines_secrets,
      torq_secrets,
      webhook_secrets,
      cases_webhook_secrets,
      xmatters_secrets,
    ])
    .optional()
    .default({}),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const defender_config = z
  .object({
    apiUrl: z.string(),
    clientId: z.string().optional(),
    oAuthScope: z.string().optional(),
    oAuthServerUrl: z.string().optional(),
    tenantId: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_actions_connector_id_Body = z.object({
  name: z.string(),
  config: z
    .union([
      bedrock_config,
      crowdstrike_config,
      d3security_config,
      email_config,
      gemini_config,
      resilient_config,
      index_config,
      jira_config,
      defender_config,
      genai_azure_config,
      genai_openai_config,
      opsgenie_config,
      pagerduty_config,
      sentinelone_config,
      servicenow_config,
      servicenow_itom_config,
      slack_api_config,
      swimlane_config,
      thehive_config,
      tines_config,
      torq_config,
      webhook_config,
      cases_webhook_config,
      xmatters_config,
    ])
    .optional()
    .default({}),
  secrets: z
    .union([
      bedrock_secrets,
      crowdstrike_secrets,
      d3security_secrets,
      email_secrets,
      gemini_secrets,
      resilient_secrets,
      jira_secrets,
      teams_secrets,
      genai_secrets,
      opsgenie_secrets,
      pagerduty_secrets,
      sentinelone_secrets,
      servicenow_secrets,
      slack_api_secrets,
      swimlane_secrets,
      thehive_secrets,
      tines_secrets,
      torq_secrets,
      webhook_secrets,
      cases_webhook_secrets,
      xmatters_secrets,
    ])
    .optional()
    .default({}),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_acknowledge_resolve_pagerduty = z
  .object({ dedupKey: z.string().max(255), eventAction: z.enum(['acknowledge', 'resolve']) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_documents = z
  .object({ documents: z.array(z.object({}).partial().passthrough()) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_message_email = z
  .object({
    bcc: z.array(z.string()).optional(),
    cc: z.array(z.string()).optional(),
    message: z.string(),
    subject: z.string(),
    to: z.array(z.string()).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_message_serverlog = z
  .object({
    level: z.enum(['debug', 'error', 'fatal', 'info', 'trace', 'warn']).optional().default('info'),
    message: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_message_slack = z.object({ message: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_trigger_pagerduty = z
  .object({
    class: z.string().optional(),
    component: z.string().optional(),
    customDetails: z.object({}).partial().passthrough().optional(),
    dedupKey: z.string().max(255).optional(),
    eventAction: z.literal('trigger'),
    group: z.string().optional(),
    links: z
      .array(z.object({ href: z.string(), text: z.string() }).partial().passthrough())
      .optional(),
    severity: z.enum(['critical', 'error', 'info', 'warning']).optional().default('info'),
    source: z.string().optional(),
    summary: z.string().max(1024).optional(),
    timestamp: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_addevent = z
  .object({
    subAction: z.literal('addEvent'),
    subActionParams: z
      .object({
        additional_info: z.string(),
        description: z.string(),
        event_class: z.string(),
        message_key: z.string(),
        metric_name: z.string(),
        node: z.string(),
        resource: z.string(),
        severity: z.string(),
        source: z.string(),
        time_of_event: z.string(),
        type: z.string(),
      })
      .partial()
      .passthrough()
      .optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_closealert = z
  .object({
    subAction: z.literal('closeAlert'),
    subActionParams: z
      .object({
        alias: z.string(),
        note: z.string().optional(),
        source: z.string().optional(),
        user: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_closeincident = z
  .object({
    subAction: z.literal('closeIncident'),
    subActionParams: z.object({ incident: z.union([z.unknown(), z.unknown()]) }).passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_createalert = z
  .object({
    subAction: z.literal('createAlert'),
    subActionParams: z
      .object({
        actions: z.array(z.string()),
        alias: z.string(),
        description: z.string(),
        details: z.object({}).partial().passthrough(),
        entity: z.string(),
        message: z.string(),
        note: z.string(),
        priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']),
        responders: z.array(
          z
            .object({
              id: z.string(),
              name: z.string(),
              type: z.enum(['escalation', 'schedule', 'team', 'user']),
              username: z.string(),
            })
            .partial()
            .passthrough()
        ),
        severity: z.number().int().gte(1).lte(4),
        source: z.string(),
        sourceRef: z.string(),
        tags: z.array(z.string()),
        title: z.string(),
        tlp: z.number().int().gte(0).lte(4).default(2),
        type: z.string(),
        user: z.string(),
        visibleTo: z.array(
          z
            .object({
              id: z.string().optional(),
              name: z.string().optional(),
              type: z.enum(['team', 'user']),
              username: z.string().optional(),
            })
            .passthrough()
        ),
      })
      .partial()
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_fieldsbyissuetype = z
  .object({
    subAction: z.literal('fieldsByIssueType'),
    subActionParams: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_getagentdetails = z
  .object({
    subAction: z.literal('getAgentDetails'),
    subActionParams: z.object({ ids: z.array(z.string()) }).passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_getagents = z.object({ subAction: z.literal('getAgents') }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_getchoices = z
  .object({
    subAction: z.literal('getChoices'),
    subActionParams: z.object({ fields: z.array(z.string()) }).passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_getfields = z.object({ subAction: z.literal('getFields') }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_getincident = z
  .object({
    subAction: z.literal('getIncident'),
    subActionParams: z.object({ externalId: z.string() }).passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_issue = z
  .object({
    subAction: z.literal('issue'),
    subActionParams: z.object({ id: z.string() }).passthrough().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_issues = z
  .object({
    subAction: z.literal('issues'),
    subActionParams: z.object({ title: z.string() }).passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_issuetypes = z.object({ subAction: z.literal('issueTypes') }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_postmessage = z
  .object({
    subAction: z.literal('postMessage'),
    subActionParams: z
      .object({
        channelIds: z.array(z.string()).max(1),
        channels: z.array(z.string()).max(1),
        text: z.string().min(1),
      })
      .partial()
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_pushtoservice = z
  .object({
    subAction: z.literal('pushToService'),
    subActionParams: z
      .object({
        comments: z.array(
          z.object({ comment: z.string(), commentId: z.number().int() }).partial().passthrough()
        ),
        incident: z
          .object({
            additional_fields: z.string().max(20).nullable(),
            alertId: z.string(),
            caseId: z.string(),
            caseName: z.string(),
            category: z.string(),
            correlation_display: z.string(),
            correlation_id: z.string(),
            description: z.string(),
            dest_ip: z.union([z.string(), z.array(z.string())]),
            externalId: z.string(),
            id: z.string(),
            impact: z.string(),
            issueType: z.number().int(),
            labels: z.array(z.string()),
            malware_hash: z.union([z.string(), z.array(z.string())]),
            malware_url: z.union([z.string(), z.array(z.string())]),
            otherFields: z.object({}).partial().passthrough(),
            parent: z.string(),
            priority: z.string(),
            ruleName: z.string(),
            severity: z.number().int(),
            short_description: z.string(),
            source_ip: z.union([z.string(), z.array(z.string())]),
            status: z.string(),
            subcategory: z.string(),
            summary: z.string(),
            tags: z.array(z.string()),
            title: z.string(),
            tlp: z.number().int().gte(0).lte(4).default(2),
            urgency: z.string(),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const run_validchannelid = z
  .object({
    subAction: z.literal('validChannelId'),
    subActionParams: z.object({ channelId: z.string() }).passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_actions_connector_id_execute_Body = z.object({
  params: z.union([
    run_acknowledge_resolve_pagerduty,
    run_documents,
    run_message_email,
    run_message_serverlog,
    run_message_slack,
    run_trigger_pagerduty,
    run_addevent,
    run_closealert,
    run_closeincident,
    run_createalert,
    run_fieldsbyissuetype,
    run_getagentdetails,
    run_getagents,
    run_getchoices,
    run_getfields,
    run_getincident,
    run_issue,
    run_issues,
    run_issuetypes,
    run_postmessage,
    run_pushtoservice,
    run_validchannelid,
  ]),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_agent_builder_agents_Body = z.object({
  avatar_color: z.string().optional(),
  avatar_symbol: z.string().optional(),
  configuration: z.object({
    instructions: z.string().optional(),
    tools: z.array(z.object({ tool_ids: z.array(z.string()) })),
  }),
  description: z.string(),
  id: z.string(),
  labels: z.array(z.string()).optional(),
  name: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_agent_builder_agents_id_Body = z
  .object({
    avatar_color: z.string(),
    avatar_symbol: z.string(),
    configuration: z
      .object({
        instructions: z.string(),
        tools: z.array(z.object({ tool_ids: z.array(z.string()) })),
      })
      .partial(),
    description: z.string(),
    labels: z.array(z.string()),
    name: z.string(),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_agent_builder_converse_Body = z.object({
  agent_id: z.string().optional().default('elastic-ai-agent'),
  capabilities: z.object({ visualizations: z.boolean() }).partial().optional(),
  connector_id: z.string().optional(),
  conversation_id: z.string().optional(),
  input: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_agent_builder_tools_Body = z.object({
  configuration: z.object({}).partial().passthrough(),
  description: z.string().optional().default(''),
  id: z.string(),
  tags: z.array(z.string()).optional().default([]),
  type: z.enum(['esql', 'index_search', 'workflow']),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_agent_builder_tools_execute_Body = z.object({
  connector_id: z.string().optional(),
  tool_id: z.string(),
  tool_params: z.object({}).partial().passthrough(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_agent_builder_tools_toolid_Body = z
  .object({
    configuration: z.object({}).partial().passthrough(),
    description: z.string(),
    tags: z.array(z.string()),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Alerting_401_response = z
  .object({ error: z.literal('Unauthorized'), message: z.string(), statusCode: z.literal(401) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Alerting_fieldmap_properties = z
  .object({
    array: z.boolean(),
    dynamic: z.boolean(),
    format: z.string(),
    ignore_above: z.number().int(),
    index: z.boolean(),
    path: z.string(),
    properties: z.record(z.object({ type: z.string() }).partial().passthrough()),
    required: z.boolean(),
    scaling_factor: z.number().int(),
    type: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_apm_anomaly = z
  .object({
    serviceName: z.string().optional(),
    transactionType: z.string().optional(),
    windowSize: z.number(),
    windowUnit: z.enum(['m', 'h', 'd']),
    environment: z.string(),
    anomalySeverityType: z.enum(['critical', 'major', 'minor', 'warning']),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_apm_error_count = z
  .object({
    serviceName: z.string().optional(),
    windowSize: z.number(),
    windowUnit: z.enum(['m', 'h', 'd']),
    environment: z.string(),
    threshold: z.number(),
    groupBy: z
      .array(
        z.enum(['service.name', 'service.environment', 'transaction.name', 'error.grouping_key'])
      )
      .optional()
      .default(['service.name', 'service.environment']),
    errorGroupingKey: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_apm_transaction_duration = z
  .object({
    serviceName: z.string().optional(),
    transactionType: z.string().optional(),
    transactionName: z.string().optional(),
    windowSize: z.number(),
    windowUnit: z.enum(['m', 'h', 'd']),
    environment: z.string(),
    threshold: z.number(),
    groupBy: z
      .array(
        z.enum(['service.name', 'service.environment', 'transaction.type', 'transaction.name'])
      )
      .optional()
      .default(['service.name', 'service.environment', 'transaction.type']),
    aggregationType: z.enum(['avg', '95th', '99th']),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_apm_transaction_error_rate = z
  .object({
    serviceName: z.string().optional(),
    transactionType: z.string().optional(),
    transactionName: z.string().optional(),
    windowSize: z.number(),
    windowUnit: z.enum(['m', 'h', 'd']),
    environment: z.string(),
    threshold: z.number(),
    groupBy: z
      .array(
        z.enum(['service.name', 'service.environment', 'transaction.type', 'transaction.name'])
      )
      .optional()
      .default(['service.name', 'service.environment', 'transaction.type']),
  })
  .passthrough();

export const aggfield = z.string();

export const aggtype = z.enum(['avg', 'count', 'max', 'min', 'sum']);

export const excludehitsfrompreviousrun = z.boolean();

export const groupby = z.enum(['all', 'top']);

export const size = z.number();

export const termfield = z.union([z.string(), z.array(z.string())]);

export const termsize = z.number();

export const threshold = z.array(z.number().int());

export const thresholdcomparator = z.enum(['>', '>=', '<', '<=', 'between', 'notBetween']);

export const timefield = z.string();

export const timewindowsize = z.number();

export const timewindowunit = z.enum(['s', 'm', 'h', 'd']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_es_query_dsl_rule = z
  .object({
    aggField: aggfield.optional(),
    aggType: aggtype.optional().default('count'),
    esQuery: z.string(),
    excludeHitsFromPreviousRun: excludehitsfrompreviousrun.optional(),
    groupBy: groupby.optional().default('all'),
    index: z.union([z.array(z.string()), z.string()]),
    searchType: z.literal('esQuery').optional().default('esQuery'),
    size: size.int().optional(),
    termField: termfield.optional(),
    termSize: termsize.int().optional(),
    threshold,
    thresholdComparator: thresholdcomparator,
    timeField: timefield,
    timeWindowSize: timewindowsize.int(),
    timeWindowUnit: timewindowunit,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_es_query_esql_rule = z
  .object({
    aggField: aggfield.optional(),
    aggType: aggtype.optional().default('count'),
    esqlQuery: z.object({ esql: z.string() }).passthrough(),
    excludeHitsFromPreviousRun: excludehitsfrompreviousrun.optional(),
    groupBy: groupby.optional().default('all'),
    searchType: z.literal('esqlQuery'),
    size: z.number().int(),
    termSize: termsize.int().optional(),
    threshold: z.array(z.number().int().gte(0).lte(0)),
    thresholdComparator: z.literal('>'),
    timeField: timefield.optional(),
    timeWindowSize: timewindowsize.int(),
    timeWindowUnit: timewindowunit,
  })
  .passthrough();

export const filter = z
  .object({
    meta: z
      .object({
        alias: z.string().nullable(),
        controlledBy: z.string(),
        disabled: z.boolean(),
        field: z.string(),
        group: z.string(),
        index: z.string(),
        isMultiIndex: z.boolean(),
        key: z.string(),
        negate: z.boolean(),
        params: z.object({}).partial().passthrough(),
        type: z.string(),
        value: z.string(),
      })
      .partial()
      .passthrough(),
    query: z.object({}).partial().passthrough(),
    $state: z.object({}).partial().passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_es_query_kql_rule = z
  .object({
    aggField: aggfield.optional(),
    aggType: aggtype.optional().default('count'),
    excludeHitsFromPreviousRun: excludehitsfrompreviousrun.optional(),
    groupBy: groupby.optional().default('all'),
    searchConfiguration: z
      .object({
        filter: z.array(filter),
        index: z.union([z.string(), z.array(z.string())]),
        query: z.object({ language: z.string(), query: z.string() }).partial().passthrough(),
      })
      .partial()
      .passthrough()
      .optional(),
    searchType: z.literal('searchSource'),
    size: size.int(),
    termField: termfield.optional(),
    termSize: termsize.int().optional(),
    threshold,
    thresholdComparator: thresholdcomparator,
    timeField: timefield.optional(),
    timeWindowSize: timewindowsize.int(),
    timeWindowUnit: timewindowunit,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_index_threshold_rule = z
  .object({
    aggField: aggfield.optional(),
    aggType: aggtype.optional().default('count'),
    filterKuery: z.string().optional(),
    groupBy: groupby.optional().default('all'),
    index: z.array(z.string()),
    termField: termfield.optional(),
    termSize: termsize.int().optional(),
    threshold,
    thresholdComparator: thresholdcomparator,
    timeField: timefield,
    timeWindowSize: timewindowsize.int(),
    timeWindowUnit: timewindowunit,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_infra_inventory = z
  .object({
    criteria: z.array(
      z
        .object({
          metric: z.enum([
            'count',
            'cpu',
            'diskLatency',
            'load',
            'memory',
            'memoryTotal',
            'tx',
            'rx',
            'logRate',
            'diskIOReadBytes',
            'diskIOWriteBytes',
            's3TotalRequests',
            's3NumberOfObjects',
            's3BucketSize',
            's3DownloadBytes',
            's3UploadBytes',
            'rdsConnections',
            'rdsQueriesExecuted',
            'rdsActiveTransactions',
            'rdsLatency',
            'sqsMessagesVisible',
            'sqsMessagesDelayed',
            'sqsMessagesSent',
            'sqsMessagesEmpty',
            'sqsOldestMessage',
            'custom',
          ]),
          timeSize: z.number(),
          timeUnit: z.enum(['s', 'm', 'h', 'd']),
          sourceId: z.string(),
          threshold: z.array(z.number()),
          comparator: z.enum(['<', '<=', '>', '>=', 'between', 'outside']),
          customMetric: z
            .object({
              type: z.literal('custom'),
              field: z.string(),
              aggregation: z.enum(['avg', 'max', 'min', 'rate']),
              id: z.string(),
              label: z.string(),
            })
            .partial()
            .passthrough(),
          warningThreshold: z.array(z.number()),
          warningComparator: z.enum(['<', '<=', '>', '>=', 'between', 'outside']),
        })
        .partial()
        .passthrough()
    ),
    filterQuery: z.string(),
    filterQueryText: z.string(),
    nodeType: z.enum(['host', 'pod', 'container', 'awsEC2', 'awsS3', 'awsSQS', 'awsRDS']),
    sourceId: z.string(),
    alertOnNoData: z.boolean(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_log_threshold = z.union([
  z
    .object({
      criteria: z
        .array(
          z
            .object({
              field: z.string(),
              comparator: z.enum([
                'more than',
                'more than or equals',
                'less than',
                'less than or equals',
                'equals',
                'does not equal',
                'matches',
                'does not match',
                'matches phrase',
                'does not match phrase',
              ]),
              value: z.union([z.number(), z.string()]),
            })
            .partial()
            .passthrough()
        )
        .optional(),
      count: z
        .object({
          comparator: z.enum([
            'more than',
            'more than or equals',
            'less than',
            'less than or equals',
            'equals',
            'does not equal',
            'matches',
            'does not match',
            'matches phrase',
            'does not match phrase',
          ]),
          value: z.number(),
        })
        .partial()
        .passthrough(),
      timeSize: z.number(),
      timeUnit: z.enum(['s', 'm', 'h', 'd']),
      logView: z
        .object({ logViewId: z.string(), type: z.literal('log-view-reference') })
        .partial()
        .passthrough(),
      groupBy: z.array(z.string()).optional(),
    })
    .passthrough(),
  z
    .object({
      criteria: z
        .array(
          z
            .array(
              z
                .object({
                  field: z.string(),
                  comparator: z.enum([
                    'more than',
                    'more than or equals',
                    'less than',
                    'less than or equals',
                    'equals',
                    'does not equal',
                    'matches',
                    'does not match',
                    'matches phrase',
                    'does not match phrase',
                  ]),
                  value: z.union([z.number(), z.string()]),
                })
                .partial()
                .passthrough()
            )
            .min(2)
            .max(2)
        )
        .optional(),
      count: z
        .object({
          comparator: z.enum([
            'more than',
            'more than or equals',
            'less than',
            'less than or equals',
            'equals',
            'does not equal',
            'matches',
            'does not match',
            'matches phrase',
            'does not match phrase',
          ]),
          value: z.number(),
        })
        .partial()
        .passthrough(),
      timeSize: z.number(),
      timeUnit: z.enum(['s', 'm', 'h', 'd']),
      logView: z
        .object({ logViewId: z.string(), type: z.literal('log-view-reference') })
        .partial()
        .passthrough(),
      groupBy: z.array(z.string()).optional(),
    })
    .passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_infra_metric_threshold = z
  .object({
    criteria: z.array(
      z.union([
        z
          .object({
            threshold: z.array(z.number()),
            comparator: z.enum(['<', '<=', '>', '>=', 'between', 'outside']),
            timeUnit: z.enum(['s', 'm', 'h', 'd']),
            timeSize: z.number(),
            warningThreshold: z.array(z.number()),
            warningComparator: z.enum(['<', '<=', '>', '>=', 'between', 'outside']),
            metric: z.string(),
            aggType: z.enum([
              'avg',
              'max',
              'min',
              'cardinality',
              'rate',
              'count',
              'sum',
              'p95',
              'p99',
              'custom',
            ]),
          })
          .partial()
          .passthrough(),
        z
          .object({
            threshold: z.array(z.number()),
            comparator: z.enum(['<', '<=', '>', '>=', 'between', 'outside']),
            timeUnit: z.enum(['s', 'm', 'h', 'd']),
            timeSize: z.number(),
            warningThreshold: z.array(z.number()),
            warningComparator: z.enum(['<', '<=', '>', '>=', 'between', 'outside']),
            aggType: z.literal('count'),
          })
          .partial()
          .passthrough(),
        z
          .object({
            threshold: z.array(z.number()),
            comparator: z.enum(['<', '<=', '>', '>=', 'between', 'outside']),
            timeUnit: z.enum(['s', 'm', 'h', 'd']),
            timeSize: z.number(),
            warningThreshold: z.array(z.number()),
            warningComparator: z.enum(['<', '<=', '>', '>=', 'between', 'outside']),
            aggType: z.literal('custom'),
            customMetric: z.array(
              z.union([
                z
                  .object({
                    name: z.string(),
                    aggType: z.enum(['avg', 'sum', 'max', 'min', 'cardinality']),
                    field: z.string(),
                  })
                  .partial()
                  .passthrough(),
                z
                  .object({ name: z.string(), aggType: z.literal('count'), filter: z.string() })
                  .partial()
                  .passthrough(),
              ])
            ),
            equation: z.string(),
            label: z.string(),
          })
          .partial()
          .passthrough(),
      ])
    ),
    groupBy: z.union([z.string(), z.array(z.string())]),
    filterQuery: z.string(),
    sourceId: z.string(),
    alertOnNoData: z.boolean(),
    alertOnGroupDisappear: z.boolean(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_slo_burn_rate = z
  .object({
    sloId: z.string(),
    burnRateThreshold: z.number(),
    maxBurnRateThreshold: z.number(),
    longWindow: z.object({ value: z.number(), unit: z.string() }).partial().passthrough(),
    shortWindow: z.object({ value: z.number(), unit: z.string() }).partial().passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_synthetics_uptime_tls = z
  .object({ search: z.string(), certExpirationThreshold: z.number(), certAgeThreshold: z.number() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const params_property_synthetics_monitor_status = z
  .object({
    availability: z
      .object({ range: z.number(), rangeUnit: z.string(), threshold: z.string() })
      .partial()
      .passthrough()
      .optional(),
    filters: z
      .union([
        z.string(),
        z
          .object({
            'monitor.type': z.array(z.string()),
            'observer.geo.name': z.array(z.string()),
            tags: z.array(z.string()),
            'url.port': z.array(z.string()),
          })
          .partial()
          .passthrough(),
      ])
      .optional(),
    locations: z.array(z.string()).optional(),
    numTimes: z.number(),
    search: z.string().optional(),
    shouldCheckStatus: z.boolean(),
    shouldCheckAvailability: z.boolean(),
    timerangeCount: z.number().optional(),
    timerangeUnit: z.string().optional(),
    timerange: z.object({ from: z.string(), to: z.string() }).partial().passthrough().optional(),
    version: z.number().optional(),
    isAutoGenerated: z.boolean().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_alerting_rule_id_Body = z.object({
  actions: z
    .array(
      z.object({
        alerts_filter: z
          .object({
            query: z.object({
              dsl: z.string().optional(),
              filters: z.array(
                z.object({
                  $state: z.object({ store: z.enum(['appState', 'globalState']) }).optional(),
                  meta: z.object({}).partial().passthrough(),
                  query: z.object({}).partial().passthrough().optional(),
                })
              ),
              kql: z.string(),
            }),
            timeframe: z.object({
              days: z.array(
                z.union([
                  z.literal(1),
                  z.literal(2),
                  z.literal(3),
                  z.literal(4),
                  z.literal(5),
                  z.literal(6),
                  z.literal(7),
                ])
              ),
              hours: z.object({ end: z.string(), start: z.string() }),
              timezone: z.string(),
            }),
          })
          .partial()
          .optional(),
        frequency: z
          .object({
            notify_when: z.enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval']),
            summary: z.boolean(),
            throttle: z.string().nullable(),
          })
          .optional(),
        group: z.string().optional(),
        id: z.string(),
        params: z.object({}).partial().passthrough().optional().default({}),
        use_alert_data_for_template: z.boolean().optional(),
        uuid: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  alert_delay: z.object({ active: z.number() }).optional(),
  artifacts: z
    .object({
      dashboards: z.array(z.object({ id: z.string() })).max(10),
      investigation_guide: z.object({ blob: z.string().max(1000) }),
    })
    .partial()
    .optional(),
  consumer: z.string(),
  enabled: z.boolean().optional().default(true),
  flapping: z
    .object({
      look_back_window: z.number().gte(2).lte(20),
      status_change_threshold: z.number().gte(2).lte(20),
    })
    .nullish(),
  name: z.string(),
  notify_when: z.enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval']).nullish(),
  rule_type_id: z.string(),
  schedule: z.object({ interval: z.string() }),
  tags: z.array(z.string()).optional().default([]),
  throttle: z.string().nullish(),
  params: z
    .union([
      params_property_apm_anomaly,
      params_property_apm_error_count,
      params_property_apm_transaction_duration,
      params_property_apm_transaction_error_rate,
      params_es_query_dsl_rule,
      params_es_query_esql_rule,
      params_es_query_kql_rule,
      params_index_threshold_rule,
      params_property_infra_inventory,
      params_property_log_threshold,
      params_property_infra_metric_threshold,
      params_property_slo_burn_rate,
      params_property_synthetics_uptime_tls,
      params_property_synthetics_monitor_status,
    ])
    .optional()
    .default({}),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_alerting_rule_id_Body = z.object({
  actions: z
    .array(
      z.object({
        alerts_filter: z
          .object({
            query: z.object({
              dsl: z.string().optional(),
              filters: z.array(
                z.object({
                  $state: z.object({ store: z.enum(['appState', 'globalState']) }).optional(),
                  meta: z.object({}).partial().passthrough(),
                  query: z.object({}).partial().passthrough().optional(),
                })
              ),
              kql: z.string(),
            }),
            timeframe: z.object({
              days: z.array(
                z.union([
                  z.literal(1),
                  z.literal(2),
                  z.literal(3),
                  z.literal(4),
                  z.literal(5),
                  z.literal(6),
                  z.literal(7),
                ])
              ),
              hours: z.object({ end: z.string(), start: z.string() }),
              timezone: z.string(),
            }),
          })
          .partial()
          .optional(),
        frequency: z
          .object({
            notify_when: z.enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval']),
            summary: z.boolean(),
            throttle: z.string().nullable(),
          })
          .optional(),
        group: z.string().optional(),
        id: z.string(),
        params: z.object({}).partial().passthrough().optional().default({}),
        use_alert_data_for_template: z.boolean().optional(),
        uuid: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  alert_delay: z.object({ active: z.number() }).optional(),
  artifacts: z
    .object({
      dashboards: z.array(z.object({ id: z.string() })).max(10),
      investigation_guide: z.object({ blob: z.string().max(1000) }),
    })
    .partial()
    .optional(),
  flapping: z
    .object({
      look_back_window: z.number().gte(2).lte(20),
      status_change_threshold: z.number().gte(2).lte(20),
    })
    .nullish(),
  name: z.string(),
  notify_when: z.enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval']).nullish(),
  params: z.object({}).partial().passthrough().optional().default({}),
  schedule: z.object({ interval: z.string() }),
  tags: z.array(z.string()).optional().default([]),
  throttle: z.string().nullish(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_alerting_rule_id_snooze_schedule_Body = z.object({
  schedule: z
    .object({
      custom: z.object({
        duration: z.string(),
        recurring: z
          .object({
            end: z.string(),
            every: z.string(),
            occurrences: z.number().gte(1),
            onMonth: z.array(z.number().gte(1).lte(12)).min(1),
            onMonthDay: z.array(z.number().gte(1).lte(31)).min(1),
            onWeekDay: z.array(z.string()).min(1),
          })
          .partial()
          .optional(),
        start: z.string(),
        timezone: z.string().optional(),
      }),
    })
    .partial(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const search_fields = z.union([z.array(z.string()), z.string()]).optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const has_reference = z.object({ id: z.string(), type: z.string() }).nullish();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_agent_keys_object = z
  .object({ name: z.string(), privileges: z.array(z.enum(['event:write', 'config_agent:read'])) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_agent_keys_response = z
  .object({
    agentKey: z
      .object({
        api_key: z.string(),
        encoded: z.string(),
        expiration: z.number().int().optional(),
        id: z.string(),
        name: z.string(),
      })
      .passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_400_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_401_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_403_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_500_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_404_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_create_annotation_object = z
  .object({
    '@timestamp': z.string(),
    message: z.string().optional(),
    service: z.object({ environment: z.string().optional(), version: z.string() }).passthrough(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_create_annotation_response = z
  .object({
    _id: z.string(),
    _index: z.string(),
    _source: z
      .object({
        '@timestamp': z.string(),
        annotation: z.object({ title: z.string(), type: z.string() }).partial().passthrough(),
        event: z.object({ created: z.string() }).partial().passthrough(),
        message: z.string(),
        service: z
          .object({ environment: z.string(), name: z.string(), version: z.string() })
          .partial()
          .passthrough(),
        tags: z.array(z.string()),
      })
      .partial()
      .passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_annotation_search_response = z
  .object({
    annotations: z.array(
      z
        .object({
          '@timestamp': z.number(),
          id: z.string(),
          text: z.string(),
          type: z.literal('version'),
        })
        .partial()
        .passthrough()
    ),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_service_object = z
  .object({ environment: z.string(), name: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_delete_service_object = z
  .object({ service: APM_UI_service_object })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_delete_agent_configurations_response = z
  .object({ result: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_settings_object = z.record(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_agent_configuration_object = z
  .object({
    '@timestamp': z.number(),
    agent_name: z.string().optional(),
    applied_by_agent: z.boolean().optional(),
    etag: z.string(),
    service: APM_UI_service_object,
    settings: APM_UI_settings_object,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_agent_configurations_response = z
  .object({ configurations: z.array(APM_UI_agent_configuration_object) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_agent_configuration_intake_object = z
  .object({
    agent_name: z.string().optional(),
    service: APM_UI_service_object,
    settings: APM_UI_settings_object,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_service_agent_name_response = z
  .object({ agentName: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_service_environment_object = z
  .object({ alreadyConfigured: z.boolean(), name: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_service_environments_response = z
  .object({ environments: z.array(APM_UI_service_environment_object) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_search_agent_configuration_object = z
  .object({
    etag: z.string().optional(),
    mark_as_applied_by_agent: z.boolean().optional(),
    service: APM_UI_service_object,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_search_agent_configuration_response = z
  .object({
    _id: z.string(),
    _index: z.string(),
    _score: z.number(),
    _source: APM_UI_agent_configuration_object,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_single_agent_configuration_response = z
  .object({ id: z.string() })
  .passthrough()
  .and(APM_UI_agent_configuration_object);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_base_source_map_object = z
  .object({
    compressionAlgorithm: z.string(),
    created: z.string(),
    decodedSha256: z.string(),
    decodedSize: z.number(),
    encodedSha256: z.string(),
    encodedSize: z.number(),
    encryptionAlgorithm: z.string(),
    id: z.string(),
    identifier: z.string(),
    packageName: z.string(),
    relative_url: z.string(),
    type: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_source_maps_response = z
  .object({
    artifacts: z.array(
      z
        .object({
          body: z
            .object({
              bundleFilepath: z.string(),
              serviceName: z.string(),
              serviceVersion: z.string(),
              sourceMap: z
                .object({
                  file: z.string(),
                  mappings: z.string(),
                  sourceRoot: z.string(),
                  sources: z.array(z.string()),
                  sourcesContent: z.array(z.string()),
                  version: z.number(),
                })
                .partial()
                .passthrough(),
            })
            .partial()
            .passthrough(),
        })
        .partial()
        .passthrough()
        .and(APM_UI_base_source_map_object)
    ),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_501_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_upload_source_map_object = z
  .object({
    bundle_filepath: z.string(),
    service_name: z.string(),
    service_version: z.string(),
    sourcemap: z.any(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const APM_UI_upload_source_maps_response = z
  .object({ body: z.string() })
  .partial()
  .passthrough()
  .and(APM_UI_base_source_map_object);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_IdField = z.enum([
  'host.name',
  'user.name',
  'service.name',
  'entity.id',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_AssetCriticalityRecordIdParts = z
  .object({ id_field: Security_Entity_Analytics_API_IdField, id_value: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_AssetCriticalityLevel = z.enum([
  'low_impact',
  'medium_impact',
  'high_impact',
  'extreme_impact',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_CreateAssetCriticalityRecord =
  Security_Entity_Analytics_API_AssetCriticalityRecordIdParts.and(
    z
      .object({ criticality_level: Security_Entity_Analytics_API_AssetCriticalityLevel })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_AssetCriticalityRecordEcsParts = z
  .object({
    asset: z
      .object({ criticality: Security_Entity_Analytics_API_AssetCriticalityLevel.optional() })
      .passthrough(),
    entity: z
      .object({
        asset: z
          .object({ criticality: Security_Entity_Analytics_API_AssetCriticalityLevel })
          .passthrough()
          .optional(),
        id: z.string(),
      })
      .passthrough()
      .optional(),
    host: z
      .object({
        asset: z
          .object({ criticality: Security_Entity_Analytics_API_AssetCriticalityLevel })
          .passthrough()
          .optional(),
        name: z.string(),
      })
      .passthrough()
      .optional(),
    service: z
      .object({
        asset: z
          .object({ criticality: Security_Entity_Analytics_API_AssetCriticalityLevel })
          .passthrough()
          .optional(),
        name: z.string(),
      })
      .passthrough()
      .optional(),
    user: z
      .object({
        asset: z
          .object({ criticality: Security_Entity_Analytics_API_AssetCriticalityLevel })
          .passthrough()
          .optional(),
        name: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_AssetCriticalityRecord =
  Security_Entity_Analytics_API_CreateAssetCriticalityRecord.and(
    Security_Entity_Analytics_API_AssetCriticalityRecordEcsParts
  ).and(z.object({ '@timestamp': z.string().datetime({ offset: true }) }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateAssetCriticalityRecord_Body =
  Security_Entity_Analytics_API_CreateAssetCriticalityRecord.and(
    z
      .object({ refresh: z.literal('wait_for') })
      .partial()
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_AssetCriticalityLevelsForBulkUpload = z.enum([
  'low_impact',
  'medium_impact',
  'high_impact',
  'extreme_impact',
  'unassigned',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const BulkUpsertAssetCriticalityRecords_Body = z
  .object({
    records: z
      .array(
        Security_Entity_Analytics_API_AssetCriticalityRecordIdParts.and(
          z
            .object({
              criticality_level: Security_Entity_Analytics_API_AssetCriticalityLevelsForBulkUpload,
            })
            .passthrough()
        )
      )
      .min(1)
      .max(1000),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_AssetCriticalityBulkUploadErrorItem = z
  .object({ index: z.number().int(), message: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_AssetCriticalityBulkUploadStats = z
  .object({ failed: z.number().int(), successful: z.number().int(), total: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_4xx_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number().int() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_assignees = z.array(z.object({ uid: z.string() }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_category = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_connector_properties_none = z
  .object({
    fields: z.string().nullable(),
    id: z.string(),
    name: z.string(),
    type: z.literal('.none'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_connector_properties_cases_webhook = z
  .object({
    fields: z.string().nullable(),
    id: z.string(),
    name: z.string(),
    type: z.literal('.cases-webhook'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_connector_properties_jira = z
  .object({
    fields: z
      .object({
        issueType: z.string().nullable(),
        parent: z.string().nullable(),
        priority: z.string().nullable(),
      })
      .passthrough(),
    id: z.string(),
    name: z.string(),
    type: z.literal('.jira'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_connector_properties_resilient = z
  .object({
    fields: z
      .object({ issueTypes: z.array(z.string()), severityCode: z.string() })
      .passthrough()
      .nullable(),
    id: z.string(),
    name: z.string(),
    type: z.literal('.resilient'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_connector_properties_servicenow = z
  .object({
    fields: z
      .object({
        category: z.string().nullable(),
        impact: z.string().nullable(),
        severity: z.string().nullable(),
        subcategory: z.string().nullable(),
        urgency: z.string().nullable(),
      })
      .passthrough(),
    id: z.string(),
    name: z.string(),
    type: z.literal('.servicenow'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_connector_properties_servicenow_sir = z
  .object({
    fields: z
      .object({
        category: z.string().nullable(),
        destIp: z.boolean().nullable(),
        malwareHash: z.boolean().nullable(),
        malwareUrl: z.boolean().nullable(),
        priority: z.string().nullable(),
        sourceIp: z.boolean().nullable(),
        subcategory: z.string().nullable(),
      })
      .passthrough(),
    id: z.string(),
    name: z.string(),
    type: z.literal('.servicenow-sir'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_connector_properties_swimlane = z
  .object({
    fields: z.object({ caseId: z.string().nullable() }).passthrough(),
    id: z.string(),
    name: z.string(),
    type: z.literal('.swimlane'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_description = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_settings = z.object({ syncAlerts: z.boolean() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_severity = z.enum(['critical', 'high', 'low', 'medium']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_status = z.enum(['closed', 'in-progress', 'open']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_tags = z.array(z.string().max(256));
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_title = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_update_case_request = z
  .object({
    cases: z
      .array(
        z
          .object({
            assignees: Cases_assignees.max(10).nullish(),
            category: Cases_case_category.max(50).optional(),
            connector: z
              .union([
                Cases_connector_properties_none,
                Cases_connector_properties_cases_webhook,
                Cases_connector_properties_jira,
                Cases_connector_properties_resilient,
                Cases_connector_properties_servicenow,
                Cases_connector_properties_servicenow_sir,
                Cases_connector_properties_swimlane,
              ])
              .optional(),
            customFields: z
              .array(
                z
                  .object({
                    key: z.string(),
                    type: z.enum(['text', 'toggle']),
                    value: z.union([z.string(), z.boolean()]),
                  })
                  .passthrough()
              )
              .max(10)
              .optional(),
            description: Cases_case_description.max(30000).optional(),
            id: z.string().max(30000),
            settings: Cases_settings.optional(),
            severity: Cases_case_severity.optional().default('low'),
            status: Cases_case_status.optional(),
            tags: Cases_case_tags.max(200).optional(),
            title: Cases_case_title.max(160).optional(),
            version: z.string(),
          })
          .passthrough()
      )
      .min(1)
      .max(100),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_response_closed_by_properties = z
  .object({
    email: z.string().nullable(),
    full_name: z.string().nullable(),
    profile_uid: z.string().optional(),
    username: z.string().nullable(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_owner = z.enum(['cases', 'observability', 'securitySolution']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_alert_comment_response_properties = z
  .object({
    alertId: z.array(z.string()).optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
    created_by: z
      .object({
        email: z.string().nullable(),
        full_name: z.string().nullable(),
        profile_uid: z.string().optional(),
        username: z.string().nullable(),
      })
      .passthrough()
      .optional(),
    id: z.string().optional(),
    index: z.array(z.string()).optional(),
    owner: Cases_owner.optional(),
    pushed_at: z.string().datetime({ offset: true }).nullish(),
    pushed_by: z
      .object({
        email: z.string().nullable(),
        full_name: z.string().nullable(),
        profile_uid: z.string().optional(),
        username: z.string().nullable(),
      })
      .passthrough()
      .nullish(),
    rule: z.object({ id: z.string(), name: z.string() }).partial().passthrough().optional(),
    type: z.literal('alert'),
    updated_at: z.string().datetime({ offset: true }).nullish(),
    updated_by: z
      .object({
        email: z.string().nullable(),
        full_name: z.string().nullable(),
        profile_uid: z.string().optional(),
        username: z.string().nullable(),
      })
      .passthrough()
      .nullish(),
    version: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_response_created_by_properties = z
  .object({
    email: z.string().nullable(),
    full_name: z.string().nullable(),
    profile_uid: z.string().optional(),
    username: z.string().nullable(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_response_pushed_by_properties = z
  .object({
    email: z.string().nullable(),
    full_name: z.string().nullable(),
    profile_uid: z.string().optional(),
    username: z.string().nullable(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_response_updated_by_properties = z
  .object({
    email: z.string().nullable(),
    full_name: z.string().nullable(),
    profile_uid: z.string().optional(),
    username: z.string().nullable(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_user_comment_response_properties = z
  .object({
    comment: z.string().optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
    created_by: Cases_case_response_created_by_properties.optional(),
    id: z.string().optional(),
    owner: Cases_owner.optional(),
    pushed_at: z.string().datetime({ offset: true }).nullish(),
    pushed_by: Cases_case_response_pushed_by_properties.nullish(),
    type: z.literal('user'),
    updated_at: z.string().datetime({ offset: true }).nullish(),
    updated_by: Cases_case_response_updated_by_properties.nullish(),
    version: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_external_service = z
  .object({
    connector_id: z.string(),
    connector_name: z.string(),
    external_id: z.string(),
    external_title: z.string(),
    external_url: z.string(),
    pushed_at: z.string().datetime({ offset: true }),
    pushed_by: z
      .object({
        email: z.string().nullable(),
        full_name: z.string().nullable(),
        profile_uid: z.string(),
        username: z.string().nullable(),
      })
      .partial()
      .passthrough()
      .nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_response_properties = z
  .object({
    assignees: Cases_assignees.max(10).nullish(),
    category: z.string().nullish(),
    closed_at: z.string().datetime({ offset: true }).nullable(),
    closed_by: Cases_case_response_closed_by_properties.nullable(),
    comments: z
      .array(
        z.union([Cases_alert_comment_response_properties, Cases_user_comment_response_properties])
      )
      .max(10000),
    connector: z.union([
      Cases_connector_properties_none,
      Cases_connector_properties_cases_webhook,
      Cases_connector_properties_jira,
      Cases_connector_properties_resilient,
      Cases_connector_properties_servicenow,
      Cases_connector_properties_servicenow_sir,
      Cases_connector_properties_swimlane,
    ]),
    created_at: z.string().datetime({ offset: true }),
    created_by: Cases_case_response_created_by_properties,
    customFields: z
      .array(
        z
          .object({
            key: z.string(),
            type: z.enum(['text', 'toggle']),
            value: z.union([z.string(), z.boolean()]),
          })
          .partial()
          .passthrough()
      )
      .optional(),
    description: z.string(),
    duration: z.number().int().nullable(),
    external_service: Cases_external_service.nullable(),
    id: z.string(),
    owner: Cases_owner,
    settings: Cases_settings,
    severity: Cases_case_severity.default('low'),
    status: Cases_case_status,
    tags: z.array(z.string()),
    title: z.string(),
    totalAlerts: z.number().int(),
    totalComment: z.number().int(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    updated_by: Cases_case_response_updated_by_properties.nullable(),
    version: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_create_case_request = z
  .object({
    assignees: Cases_assignees.max(10).nullish(),
    category: Cases_case_category.max(50).optional(),
    connector: z.union([
      Cases_connector_properties_none,
      Cases_connector_properties_cases_webhook,
      Cases_connector_properties_jira,
      Cases_connector_properties_resilient,
      Cases_connector_properties_servicenow,
      Cases_connector_properties_servicenow_sir,
      Cases_connector_properties_swimlane,
    ]),
    customFields: z
      .array(
        z
          .object({
            key: z.string(),
            type: z.enum(['text', 'toggle']),
            value: z.union([z.string(), z.boolean()]),
          })
          .passthrough()
      )
      .max(10)
      .optional(),
    description: Cases_case_description.max(30000),
    owner: Cases_owner,
    settings: Cases_settings,
    severity: Cases_case_severity.optional().default('low'),
    tags: Cases_case_tags.max(200),
    title: Cases_case_title.max(160),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_string = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_string_array = z.array(Cases_string);

export const assignees = z.union([Cases_string, Cases_string_array]).optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_case_categories = z.array(Cases_case_category);

export const category = z.union([Cases_case_category, Cases_case_categories]).optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_owners = z.array(Cases_owner);

export const owner = z.union([Cases_owner, Cases_owners]).optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_searchFieldsType = z.enum(['description', 'title']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_searchFieldsTypeArray = z.array(Cases_searchFieldsType);

export const searchFields = z
  .union([Cases_searchFieldsType, Cases_searchFieldsTypeArray])
  .optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_alert_response_properties = z
  .object({ attached_at: z.string().datetime({ offset: true }), id: z.string(), index: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_alert_identifiers = z.union([z.string(), z.array(z.string())]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_alert_indices = z.union([z.string(), z.array(z.string())]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_rule = z.object({ id: z.string(), name: z.string() }).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_update_alert_comment_request_properties = z
  .object({
    alertId: Cases_alert_identifiers,
    id: z.string(),
    index: Cases_alert_indices,
    owner: Cases_owner,
    rule: Cases_rule,
    type: z.literal('alert'),
    version: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_update_user_comment_request_properties = z
  .object({
    comment: z.string().max(30000),
    id: z.string(),
    owner: Cases_owner,
    type: z.literal('user'),
    version: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_update_case_comment_request = z.union([
  Cases_update_alert_comment_request_properties,
  Cases_update_user_comment_request_properties,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_add_alert_comment_request_properties = z
  .object({
    alertId: Cases_alert_identifiers,
    index: Cases_alert_indices,
    owner: Cases_owner,
    rule: Cases_rule,
    type: z.literal('alert'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_add_user_comment_request_properties = z
  .object({ comment: z.string().max(30000), owner: Cases_owner, type: z.literal('user') })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_add_case_comment_request = z.union([
  Cases_add_alert_comment_request_properties,
  Cases_add_user_comment_request_properties,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_add_case_file_request = z
  .object({ file: z.any(), filename: z.string().optional() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_actions = z.enum(['add', 'create', 'delete', 'push_to_service', 'update']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_alert_comment = z
  .object({
    comment: z
      .object({
        alertId: z.union([z.string(), z.array(z.string())]),
        index: z.union([z.string(), z.array(z.string())]),
        owner: Cases_owner,
        rule: z.object({ id: z.string(), name: z.string() }).partial().passthrough(),
        type: z.literal('alert'),
      })
      .partial()
      .passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_assignees = z
  .object({ assignees: Cases_assignees.max(10).nullable() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_connector_types = z.enum([
  '.cases-webhook',
  '.jira',
  '.none',
  '.resilient',
  '.servicenow',
  '.servicenow-sir',
  '.swimlane',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_connector = z
  .object({
    connector: z
      .object({
        fields: z
          .object({
            caseId: z.string(),
            category: z.string(),
            destIp: z.boolean().nullable(),
            impact: z.string(),
            issueType: z.string(),
            issueTypes: z.array(z.string()),
            malwareHash: z.boolean().nullable(),
            malwareUrl: z.boolean().nullable(),
            parent: z.string(),
            priority: z.string(),
            severity: z.string(),
            severityCode: z.string(),
            sourceIp: z.boolean().nullable(),
            subcategory: z.string(),
            urgency: z.string(),
          })
          .partial()
          .passthrough()
          .nullable(),
        id: z.string(),
        name: z.string(),
        type: Cases_connector_types,
      })
      .partial()
      .passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_create_case = z
  .object({
    assignees: Cases_assignees.max(10).nullable(),
    connector: z
      .object({
        fields: z
          .object({
            caseId: z.string(),
            category: z.string(),
            destIp: z.boolean().nullable(),
            impact: z.string(),
            issueType: z.string(),
            issueTypes: z.array(z.string()),
            malwareHash: z.boolean().nullable(),
            malwareUrl: z.boolean().nullable(),
            parent: z.string(),
            priority: z.string(),
            severity: z.string(),
            severityCode: z.string(),
            sourceIp: z.boolean().nullable(),
            subcategory: z.string(),
            urgency: z.string(),
          })
          .partial()
          .passthrough()
          .nullable(),
        id: z.string(),
        name: z.string(),
        type: Cases_connector_types,
      })
      .partial()
      .passthrough(),
    description: z.string(),
    owner: Cases_owner,
    settings: Cases_settings,
    severity: Cases_case_severity.default('low'),
    status: Cases_case_status,
    tags: z.array(z.string()),
    title: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_delete = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_description = z
  .object({ description: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_pushed = z
  .object({ externalService: Cases_external_service.nullable() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_settings = z
  .object({ settings: Cases_settings })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_severity = z
  .object({ severity: Cases_case_severity.default('low') })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_status = z.object({ status: Cases_case_status }).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_tags = z
  .object({ tags: z.array(z.string()) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_title = z.object({ title: z.string() }).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_payload_user_comment = z
  .object({
    comment: z
      .object({ comment: z.string(), owner: Cases_owner, type: z.literal('user') })
      .partial()
      .passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_user_actions_find_response_properties = z
  .object({
    action: Cases_actions,
    comment_id: z.string().nullable(),
    created_at: z.string().datetime({ offset: true }),
    created_by: z
      .object({
        email: z.string().nullable(),
        full_name: z.string().nullable(),
        profile_uid: z.string().optional(),
        username: z.string().nullable(),
      })
      .passthrough(),
    id: z.string(),
    owner: Cases_owner,
    payload: z.union([
      Cases_payload_alert_comment,
      Cases_payload_assignees,
      Cases_payload_connector,
      Cases_payload_create_case,
      Cases_payload_delete,
      Cases_payload_description,
      Cases_payload_pushed,
      Cases_payload_settings,
      Cases_payload_severity,
      Cases_payload_status,
      Cases_payload_tags,
      Cases_payload_title,
      Cases_payload_user_comment,
    ]),
    type: z.enum([
      'assignees',
      'create_case',
      'comment',
      'connector',
      'description',
      'pushed',
      'tags',
      'title',
      'status',
      'settings',
      'severity',
    ]),
    version: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_closure_types = z.enum(['close-by-pushing', 'close-by-user']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_template_tags = z.array(z.string().max(256));
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_templates = z.array(
  z
    .object({
      caseFields: z
        .object({
          assignees: Cases_assignees.max(10).nullable(),
          category: Cases_case_category.max(50),
          connector: z
            .object({
              fields: z.object({}).partial().passthrough().nullable(),
              id: z.string(),
              name: z.string(),
              type: Cases_connector_types,
            })
            .partial()
            .passthrough(),
          customFields: z.array(
            z
              .object({
                key: z.string(),
                type: z.enum(['text', 'toggle']),
                value: z.union([z.string(), z.boolean()]),
              })
              .partial()
              .passthrough()
          ),
          description: Cases_case_description.max(30000),
          settings: Cases_settings,
          severity: Cases_case_severity.default('low'),
          tags: Cases_case_tags.max(200),
          title: Cases_case_title.max(160),
        })
        .partial()
        .passthrough(),
      description: z.string(),
      key: z.string(),
      name: z.string(),
      tags: Cases_template_tags.max(200),
    })
    .partial()
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_set_case_configuration_request = z
  .object({
    closure_type: Cases_closure_types,
    connector: z
      .object({
        fields: z.object({}).partial().passthrough().nullable(),
        id: z.string(),
        name: z.string(),
        type: Cases_connector_types,
      })
      .passthrough(),
    customFields: z
      .array(
        z
          .object({
            defaultValue: z.union([z.string(), z.boolean()]).optional(),
            key: z.string().min(1).max(36),
            label: z.string().min(1).max(50),
            type: z.enum(['text', 'toggle']),
            required: z.boolean(),
          })
          .passthrough()
      )
      .max(10)
      .optional(),
    owner: Cases_owner,
    templates: Cases_templates.optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Cases_update_case_configuration_request = z
  .object({
    closure_type: Cases_closure_types.optional(),
    connector: z
      .object({
        fields: z.object({}).partial().passthrough().nullable(),
        id: z.string(),
        name: z.string(),
        type: Cases_connector_types,
      })
      .passthrough()
      .optional(),
    customFields: z
      .array(
        z
          .object({
            defaultValue: z.union([z.string(), z.boolean()]).optional(),
            key: z.string().min(1).max(36),
            label: z.string().min(1).max(50),
            type: z.enum(['text', 'toggle']),
            required: z.boolean(),
          })
          .passthrough()
      )
      .optional(),
    templates: Cases_templates.optional(),
    version: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_400_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_allownoindex = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_fieldattrs = z
  .object({
    count: z.number().int(),
    customDescription: z.string().max(300),
    customLabel: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_fieldformats = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_namespaces = z.array(z.string().default('default'));
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_runtimefieldmap = z
  .object({ script: z.object({ source: z.string() }).partial().passthrough(), type: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_sourcefilters = z.array(z.object({ value: z.string() }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_timefieldname = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_title = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_type = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_typemeta = z
  .object({
    aggs: z.object({}).partial().passthrough(),
    params: z.object({}).partial().passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_create_data_view_request_object = z
  .object({
    data_view: z
      .object({
        allowNoIndex: Data_views_allownoindex.optional(),
        fieldAttrs: z.record(Data_views_fieldattrs).optional(),
        fieldFormats: Data_views_fieldformats.optional(),
        fields: z.object({}).partial().passthrough().optional(),
        id: z.string().optional(),
        name: z.string().optional(),
        namespaces: Data_views_namespaces.optional(),
        runtimeFieldMap: z.record(Data_views_runtimefieldmap).optional(),
        sourceFilters: Data_views_sourcefilters.optional(),
        timeFieldName: Data_views_timefieldname.optional(),
        title: Data_views_title,
        type: Data_views_type.optional(),
        typeMeta: Data_views_typemeta.optional(),
        version: z.string().optional(),
      })
      .passthrough(),
    override: z.boolean().optional().default(false),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_typemeta_response = z
  .object({
    aggs: z.object({}).partial().passthrough(),
    params: z.object({}).partial().passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_data_view_response_object = z
  .object({
    data_view: z
      .object({
        allowNoIndex: Data_views_allownoindex,
        fieldAttrs: z.record(Data_views_fieldattrs),
        fieldFormats: Data_views_fieldformats,
        fields: z.object({}).partial().passthrough(),
        id: z.string(),
        name: z.string(),
        namespaces: Data_views_namespaces,
        runtimeFieldMap: z.record(Data_views_runtimefieldmap),
        sourceFilters: Data_views_sourcefilters,
        timeFieldName: Data_views_timefieldname,
        title: Data_views_title,
        typeMeta: Data_views_typemeta_response.nullable(),
        version: z.string(),
      })
      .partial()
      .passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_404_response = z
  .object({ error: z.literal('Not Found'), message: z.string(), statusCode: z.literal(404) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_update_data_view_request_object = z
  .object({
    data_view: z
      .object({
        allowNoIndex: Data_views_allownoindex,
        fieldFormats: Data_views_fieldformats,
        fields: z.object({}).partial().passthrough(),
        name: z.string(),
        runtimeFieldMap: z.record(Data_views_runtimefieldmap),
        sourceFilters: Data_views_sourcefilters,
        timeFieldName: Data_views_timefieldname,
        title: Data_views_title,
        type: Data_views_type,
        typeMeta: Data_views_typemeta,
      })
      .partial()
      .passthrough(),
    refresh_fields: z.boolean().optional().default(false),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const createRuntimeFieldDefault_Body = z
  .object({ name: z.string(), runtimeField: z.object({}).partial().passthrough() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const setDefaultDatailViewDefault_Body = z
  .object({ data_view_id: z.string().nullable(), force: z.boolean().optional().default(false) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Data_views_swap_data_view_request_object = z
  .object({
    delete: z.boolean().optional(),
    forId: z.union([z.string(), z.array(z.string())]).optional(),
    forType: z.string().optional(),
    fromId: z.string(),
    fromType: z.string().optional(),
    toId: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_PlatformErrorResponse = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SiemErrorResponse = z
  .object({ message: z.string(), status_code: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleActionAlertsFilter = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleActionNotifyWhen = z.enum([
  'onActiveAlert',
  'onThrottleInterval',
  'onActionGroupChange',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleActionThrottle = z.union([
  z.enum(['no_actions', 'rule']),
  z.string(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleActionFrequency = z
  .object({
    notifyWhen: Security_Detections_API_RuleActionNotifyWhen,
    summary: z.boolean(),
    throttle: Security_Detections_API_RuleActionThrottle,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleActionGroup = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleActionId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleActionParams = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NonEmptyString = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleAction = z
  .object({
    action_type_id: z.string(),
    alerts_filter: Security_Detections_API_RuleActionAlertsFilter.optional(),
    frequency: Security_Detections_API_RuleActionFrequency.optional(),
    group: Security_Detections_API_RuleActionGroup.optional(),
    id: Security_Detections_API_RuleActionId,
    params: Security_Detections_API_RuleActionParams,
    uuid: Security_Detections_API_NonEmptyString.min(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedObjectResolveAliasPurpose = z.enum([
  'savedObjectConversion',
  'savedObjectImport',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedObjectResolveAliasTargetId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleAuthorArray = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BuildingBlockType = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleDescription = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_IsRuleEnabled = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ExceptionListType = z.enum([
  'detection',
  'rule_default',
  'endpoint',
  'endpoint_trusted_apps',
  'endpoint_trusted_devices',
  'endpoint_events',
  'endpoint_host_isolation_exceptions',
  'endpoint_blocklists',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleExceptionList = z
  .object({
    id: z.string().min(1),
    list_id: z.string().min(1),
    namespace_type: z.enum(['agnostic', 'single']),
    type: Security_Detections_API_ExceptionListType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleFalsePositiveArray = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleIntervalFrom = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleInterval = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_InvestigationFields = z
  .object({ field_names: z.array(Security_Detections_API_NonEmptyString).min(1) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleLicense = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MaxSignals = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleMetadata = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleName = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertsIndexNamespace = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_InvestigationGuide = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedObjectResolveOutcome = z.enum([
  'exactMatch',
  'aliasMatch',
  'conflict',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertsIndex = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleReferenceArray = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RelatedIntegration = z
  .object({
    integration: Security_Detections_API_NonEmptyString.min(1).optional(),
    package: Security_Detections_API_NonEmptyString.min(1),
    version: Security_Detections_API_NonEmptyString.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RelatedIntegrationArray = z.array(
  Security_Detections_API_RelatedIntegration
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RequiredFieldInput = z
  .object({ name: z.string().min(1), type: z.string().min(1) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EcsMapping = z.record(
  z
    .object({ field: z.string(), value: z.union([z.string(), z.array(z.string())]) })
    .partial()
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_OsqueryQuery = z
  .object({
    ecs_mapping: Security_Detections_API_EcsMapping.optional(),
    id: z.string(),
    platform: z.string().optional(),
    query: z.string(),
    removed: z.boolean().optional(),
    snapshot: z.boolean().optional(),
    version: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_OsqueryParams = z
  .object({
    ecs_mapping: Security_Detections_API_EcsMapping,
    pack_id: z.string(),
    queries: z.array(Security_Detections_API_OsqueryQuery),
    query: z.string(),
    saved_query_id: z.string(),
    timeout: z.number(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_OsqueryResponseAction = z
  .object({ action_type_id: z.literal('.osquery'), params: Security_Detections_API_OsqueryParams })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_DefaultParams = z
  .object({ command: z.literal('isolate'), comment: z.string().optional() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ProcessesParams = z
  .object({
    command: z.enum(['kill-process', 'suspend-process']),
    comment: z.string().optional(),
    config: z
      .object({ field: z.string(), overwrite: z.boolean().optional().default(true) })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EndpointResponseAction = z
  .object({
    action_type_id: z.literal('.endpoint'),
    params: z.union([
      Security_Detections_API_DefaultParams,
      Security_Detections_API_ProcessesParams,
    ]),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ResponseAction = z.union([
  Security_Detections_API_OsqueryResponseAction,
  Security_Detections_API_EndpointResponseAction,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RiskScore = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RiskScoreMapping = z.array(
  z
    .object({
      field: z.string(),
      operator: z.literal('equals'),
      risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100).optional(),
      value: z.string(),
    })
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleNameOverride = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SetupGuide = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_Severity = z.enum(['low', 'medium', 'high', 'critical']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SeverityMapping = z.array(
  z
    .object({
      field: z.string(),
      operator: z.literal('equals'),
      severity: Security_Detections_API_Severity,
      value: z.string(),
    })
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleTagArray = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatTactic = z
  .object({ id: z.string(), name: z.string(), reference: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatSubtechnique = z
  .object({ id: z.string(), name: z.string(), reference: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatTechnique = z
  .object({
    id: z.string(),
    name: z.string(),
    reference: z.string(),
    subtechnique: z.array(Security_Detections_API_ThreatSubtechnique).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_Threat = z
  .object({
    framework: z.string(),
    tactic: Security_Detections_API_ThreatTactic,
    technique: z.array(Security_Detections_API_ThreatTechnique).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatArray = z.array(Security_Detections_API_Threat);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_TimelineTemplateId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_TimelineTemplateTitle = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_TimestampOverride = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_TimestampOverrideFallbackDisabled = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleIntervalTo = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleVersion = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleExecutionMetrics = z
  .object({
    execution_gap_duration_s: z.number().int().gte(0),
    frozen_indices_queried_count: z.number().int().gte(0),
    gap_range: z.object({ gte: z.string(), lte: z.string() }).passthrough(),
    total_enrichment_duration_ms: z.number().int().gte(0),
    total_indexing_duration_ms: z.number().int().gte(0),
    total_search_duration_ms: z.number().int().gte(0),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleExecutionStatus = z.enum([
  'going to run',
  'running',
  'partial failure',
  'failed',
  'succeeded',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleExecutionStatusOrder = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleExecutionSummary = z
  .object({
    last_execution: z
      .object({
        date: z.string().datetime({ offset: true }),
        message: z.string(),
        metrics: Security_Detections_API_RuleExecutionMetrics,
        status: Security_Detections_API_RuleExecutionStatus,
        status_order: Security_Detections_API_RuleExecutionStatusOrder.int(),
      })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_UUID = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleObjectId = Security_Detections_API_UUID;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_IsRuleImmutable = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RequiredField = z
  .object({ ecs: z.boolean(), name: z.string().min(1), type: z.string().min(1) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RequiredFieldArray = z.array(
  Security_Detections_API_RequiredField
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleRevision = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleSignatureId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_IsExternalRuleCustomized = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ExternalRuleSource = z
  .object({
    is_customized: Security_Detections_API_IsExternalRuleCustomized,
    type: z.literal('external'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_InternalRuleSource = z
  .object({ type: z.literal('internal') })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleSource = z.union([
  Security_Detections_API_ExternalRuleSource,
  Security_Detections_API_InternalRuleSource,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ResponseFields = z
  .object({
    created_at: z.string().datetime({ offset: true }),
    created_by: z.string(),
    execution_summary: Security_Detections_API_RuleExecutionSummary.optional(),
    id: Security_Detections_API_RuleObjectId,
    immutable: Security_Detections_API_IsRuleImmutable,
    required_fields: Security_Detections_API_RequiredFieldArray,
    revision: Security_Detections_API_RuleRevision.int().gte(0),
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_source: Security_Detections_API_RuleSource,
    updated_at: z.string().datetime({ offset: true }),
    updated_by: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlQueryLanguage = z.literal('eql');
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleQuery = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlRequiredFields = z
  .object({
    language: Security_Detections_API_EqlQueryLanguage,
    query: Security_Detections_API_RuleQuery,
    type: z.literal('eql'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertSuppressionDurationUnit = z.enum(['s', 'm', 'h']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertSuppressionDuration = z
  .object({
    unit: Security_Detections_API_AlertSuppressionDurationUnit,
    value: z.number().int().gte(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertSuppressionGroupBy = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertSuppressionMissingFieldsStrategy = z.enum([
  'doNotSuppress',
  'suppress',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertSuppression = z
  .object({
    duration: Security_Detections_API_AlertSuppressionDuration.optional(),
    group_by: Security_Detections_API_AlertSuppressionGroupBy.min(1).max(3),
    missing_fields_strategy:
      Security_Detections_API_AlertSuppressionMissingFieldsStrategy.optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_DataViewId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EventCategoryOverride = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleFilterArray = z.array(z.unknown());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_IndexPatternArray = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_TiebreakerField = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_TimestampField = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlOptionalFields = z
  .object({
    alert_suppression: Security_Detections_API_AlertSuppression,
    data_view_id: Security_Detections_API_DataViewId,
    event_category_override: Security_Detections_API_EventCategoryOverride,
    filters: Security_Detections_API_RuleFilterArray,
    index: Security_Detections_API_IndexPatternArray,
    tiebreaker_field: Security_Detections_API_TiebreakerField,
    timestamp_field: Security_Detections_API_TimestampField,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlRuleResponseFields =
  Security_Detections_API_EqlRequiredFields.and(Security_Detections_API_EqlOptionalFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlRule = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .passthrough()
  .and(Security_Detections_API_ResponseFields)
  .and(Security_Detections_API_EqlRuleResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRuleRequiredFields = z
  .object({ type: z.literal('query') })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRuleOptionalFields = z
  .object({
    alert_suppression: Security_Detections_API_AlertSuppression,
    data_view_id: Security_Detections_API_DataViewId,
    filters: Security_Detections_API_RuleFilterArray,
    index: Security_Detections_API_IndexPatternArray,
    saved_id: Security_Detections_API_SavedQueryId,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_KqlQueryLanguage = z.enum(['kuery', 'lucene']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRuleResponseFields =
  Security_Detections_API_QueryRuleRequiredFields.and(
    Security_Detections_API_QueryRuleOptionalFields
  ).and(
    z
      .object({
        language: Security_Detections_API_KqlQueryLanguage,
        query: Security_Detections_API_RuleQuery,
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRule = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .passthrough()
  .and(Security_Detections_API_ResponseFields)
  .and(Security_Detections_API_QueryRuleResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRuleRequiredFields = z
  .object({ saved_id: Security_Detections_API_SavedQueryId, type: z.literal('saved_query') })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRuleOptionalFields = z
  .object({
    alert_suppression: Security_Detections_API_AlertSuppression,
    data_view_id: Security_Detections_API_DataViewId,
    filters: Security_Detections_API_RuleFilterArray,
    index: Security_Detections_API_IndexPatternArray,
    query: Security_Detections_API_RuleQuery,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRuleResponseFields =
  Security_Detections_API_SavedQueryRuleRequiredFields.and(
    Security_Detections_API_SavedQueryRuleOptionalFields
  ).and(z.object({ language: Security_Detections_API_KqlQueryLanguage }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRule = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .passthrough()
  .and(Security_Detections_API_ResponseFields)
  .and(Security_Detections_API_SavedQueryRuleResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdCardinality = z.array(
  z.object({ field: z.string(), value: z.number().int().gte(0) }).passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdField = z.union([z.string(), z.array(z.string())]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdValue = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_Threshold = z
  .object({
    cardinality: Security_Detections_API_ThresholdCardinality.optional(),
    field: Security_Detections_API_ThresholdField,
    value: Security_Detections_API_ThresholdValue.int().gte(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRuleRequiredFields = z
  .object({
    query: Security_Detections_API_RuleQuery,
    threshold: Security_Detections_API_Threshold,
    type: z.literal('threshold'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdAlertSuppression = z
  .object({ duration: Security_Detections_API_AlertSuppressionDuration })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRuleOptionalFields = z
  .object({
    alert_suppression: Security_Detections_API_ThresholdAlertSuppression,
    data_view_id: Security_Detections_API_DataViewId,
    filters: Security_Detections_API_RuleFilterArray,
    index: Security_Detections_API_IndexPatternArray,
    saved_id: Security_Detections_API_SavedQueryId,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRuleResponseFields =
  Security_Detections_API_ThresholdRuleRequiredFields.and(
    Security_Detections_API_ThresholdRuleOptionalFields
  ).and(z.object({ language: Security_Detections_API_KqlQueryLanguage }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRule = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .passthrough()
  .and(Security_Detections_API_ResponseFields)
  .and(Security_Detections_API_ThresholdRuleResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatIndex = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMappingEntry = z
  .object({
    field: Security_Detections_API_NonEmptyString.min(1),
    negate: z.boolean().optional(),
    type: z.literal('mapping'),
    value: Security_Detections_API_NonEmptyString.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMapping = z.array(
  z.object({ entries: z.array(Security_Detections_API_ThreatMappingEntry) }).passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatQuery = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRuleRequiredFields = z
  .object({
    query: Security_Detections_API_RuleQuery,
    threat_index: Security_Detections_API_ThreatIndex,
    threat_mapping: Security_Detections_API_ThreatMapping.min(1),
    threat_query: Security_Detections_API_ThreatQuery,
    type: z.literal('threat_match'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ConcurrentSearches = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ItemsPerSearch = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatFilters = z.array(z.unknown());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatIndicatorPath = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRuleOptionalFields = z
  .object({
    alert_suppression: Security_Detections_API_AlertSuppression,
    concurrent_searches: Security_Detections_API_ConcurrentSearches.int().gte(1),
    data_view_id: Security_Detections_API_DataViewId,
    filters: Security_Detections_API_RuleFilterArray,
    index: Security_Detections_API_IndexPatternArray,
    items_per_search: Security_Detections_API_ItemsPerSearch.int().gte(1),
    saved_id: Security_Detections_API_SavedQueryId,
    threat_filters: Security_Detections_API_ThreatFilters,
    threat_indicator_path: Security_Detections_API_ThreatIndicatorPath,
    threat_language: Security_Detections_API_KqlQueryLanguage,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRuleResponseFields =
  Security_Detections_API_ThreatMatchRuleRequiredFields.and(
    Security_Detections_API_ThreatMatchRuleOptionalFields
  ).and(z.object({ language: Security_Detections_API_KqlQueryLanguage }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRule = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .passthrough()
  .and(Security_Detections_API_ResponseFields)
  .and(Security_Detections_API_ThreatMatchRuleResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AnomalyThreshold = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningJobId = z.union([
  z.string(),
  z.array(z.string()),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRuleRequiredFields = z
  .object({
    anomaly_threshold: Security_Detections_API_AnomalyThreshold.int().gte(0),
    machine_learning_job_id: Security_Detections_API_MachineLearningJobId,
    type: z.literal('machine_learning'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRuleOptionalFields = z
  .object({ alert_suppression: Security_Detections_API_AlertSuppression })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRuleResponseFields =
  Security_Detections_API_MachineLearningRuleRequiredFields.and(
    Security_Detections_API_MachineLearningRuleOptionalFields
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRule = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .passthrough()
  .and(Security_Detections_API_ResponseFields)
  .and(Security_Detections_API_MachineLearningRuleResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_HistoryWindowStart = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsFields = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRuleRequiredFields = z
  .object({
    history_window_start: Security_Detections_API_HistoryWindowStart.min(1),
    new_terms_fields: Security_Detections_API_NewTermsFields.min(1).max(3),
    query: Security_Detections_API_RuleQuery,
    type: z.literal('new_terms'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRuleOptionalFields = z
  .object({
    alert_suppression: Security_Detections_API_AlertSuppression,
    data_view_id: Security_Detections_API_DataViewId,
    filters: Security_Detections_API_RuleFilterArray,
    index: Security_Detections_API_IndexPatternArray,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRuleResponseFields =
  Security_Detections_API_NewTermsRuleRequiredFields.and(
    Security_Detections_API_NewTermsRuleOptionalFields
  ).and(z.object({ language: Security_Detections_API_KqlQueryLanguage }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRule = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .passthrough()
  .and(Security_Detections_API_ResponseFields)
  .and(Security_Detections_API_NewTermsRuleResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlRuleOptionalFields = z
  .object({ alert_suppression: Security_Detections_API_AlertSuppression })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlQueryLanguage = z.literal('esql');
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlRuleRequiredFields = z
  .object({
    language: Security_Detections_API_EsqlQueryLanguage,
    query: Security_Detections_API_RuleQuery,
    type: z.literal('esql'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlRuleResponseFields =
  Security_Detections_API_EsqlRuleOptionalFields.and(
    Security_Detections_API_EsqlRuleRequiredFields
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlRule = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .passthrough()
  .and(Security_Detections_API_ResponseFields)
  .and(Security_Detections_API_EsqlRuleResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleResponse: z.ZodType<any> = z.union([
  Security_Detections_API_EqlRule,
  Security_Detections_API_QueryRule,
  Security_Detections_API_SavedQueryRule,
  Security_Detections_API_ThresholdRule,
  Security_Detections_API_ThreatMatchRule,
  Security_Detections_API_MachineLearningRule,
  Security_Detections_API_NewTermsRule,
  Security_Detections_API_EsqlRule,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlRulePatchFields = z
  .object({
    language: Security_Detections_API_EqlQueryLanguage,
    query: Security_Detections_API_RuleQuery,
    type: z.literal('eql'),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_EqlOptionalFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlRulePatchProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose,
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId,
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType,
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    id: Security_Detections_API_RuleObjectId,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields,
    license: Security_Detections_API_RuleLicense,
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata,
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace,
    note: Security_Detections_API_InvestigationGuide,
    outcome: Security_Detections_API_SavedObjectResolveOutcome,
    output_index: Security_Detections_API_AlertsIndex,
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_name_override: Security_Detections_API_RuleNameOverride,
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle,
    timeline_id: Security_Detections_API_TimelineTemplateId,
    timeline_title: Security_Detections_API_TimelineTemplateTitle,
    timestamp_override: Security_Detections_API_TimestampOverride,
    timestamp_override_fallback_disabled: Security_Detections_API_TimestampOverrideFallbackDisabled,
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_EqlRulePatchFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRuleDefaultableFields = z
  .object({
    language: Security_Detections_API_KqlQueryLanguage,
    query: Security_Detections_API_RuleQuery,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRulePatchFields = z
  .object({ type: z.literal('query') })
  .partial()
  .passthrough()
  .and(Security_Detections_API_QueryRuleOptionalFields)
  .and(Security_Detections_API_QueryRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRulePatchProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose,
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId,
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType,
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    id: Security_Detections_API_RuleObjectId,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields,
    license: Security_Detections_API_RuleLicense,
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata,
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace,
    note: Security_Detections_API_InvestigationGuide,
    outcome: Security_Detections_API_SavedObjectResolveOutcome,
    output_index: Security_Detections_API_AlertsIndex,
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_name_override: Security_Detections_API_RuleNameOverride,
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle,
    timeline_id: Security_Detections_API_TimelineTemplateId,
    timeline_title: Security_Detections_API_TimelineTemplateTitle,
    timestamp_override: Security_Detections_API_TimestampOverride,
    timestamp_override_fallback_disabled: Security_Detections_API_TimestampOverrideFallbackDisabled,
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_QueryRulePatchFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRuleDefaultableFields = z
  .object({ language: Security_Detections_API_KqlQueryLanguage })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRulePatchFields = z
  .object({ saved_id: Security_Detections_API_SavedQueryId, type: z.literal('saved_query') })
  .partial()
  .passthrough()
  .and(Security_Detections_API_SavedQueryRuleOptionalFields)
  .and(Security_Detections_API_SavedQueryRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRulePatchProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose,
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId,
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType,
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    id: Security_Detections_API_RuleObjectId,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields,
    license: Security_Detections_API_RuleLicense,
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata,
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace,
    note: Security_Detections_API_InvestigationGuide,
    outcome: Security_Detections_API_SavedObjectResolveOutcome,
    output_index: Security_Detections_API_AlertsIndex,
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_name_override: Security_Detections_API_RuleNameOverride,
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle,
    timeline_id: Security_Detections_API_TimelineTemplateId,
    timeline_title: Security_Detections_API_TimelineTemplateTitle,
    timestamp_override: Security_Detections_API_TimestampOverride,
    timestamp_override_fallback_disabled: Security_Detections_API_TimestampOverrideFallbackDisabled,
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_SavedQueryRulePatchFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRuleDefaultableFields = z
  .object({ language: Security_Detections_API_KqlQueryLanguage })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRulePatchFields = z
  .object({
    query: Security_Detections_API_RuleQuery,
    threshold: Security_Detections_API_Threshold,
    type: z.literal('threshold'),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_ThresholdRuleOptionalFields)
  .and(Security_Detections_API_ThresholdRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRulePatchProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose,
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId,
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType,
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    id: Security_Detections_API_RuleObjectId,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields,
    license: Security_Detections_API_RuleLicense,
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata,
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace,
    note: Security_Detections_API_InvestigationGuide,
    outcome: Security_Detections_API_SavedObjectResolveOutcome,
    output_index: Security_Detections_API_AlertsIndex,
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_name_override: Security_Detections_API_RuleNameOverride,
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle,
    timeline_id: Security_Detections_API_TimelineTemplateId,
    timeline_title: Security_Detections_API_TimelineTemplateTitle,
    timestamp_override: Security_Detections_API_TimestampOverride,
    timestamp_override_fallback_disabled: Security_Detections_API_TimestampOverrideFallbackDisabled,
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_ThresholdRulePatchFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRuleDefaultableFields = z
  .object({ language: Security_Detections_API_KqlQueryLanguage })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRulePatchFields = z
  .object({
    query: Security_Detections_API_RuleQuery,
    threat_index: Security_Detections_API_ThreatIndex,
    threat_mapping: Security_Detections_API_ThreatMapping.min(1),
    threat_query: Security_Detections_API_ThreatQuery,
    type: z.literal('threat_match'),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_ThreatMatchRuleOptionalFields)
  .and(Security_Detections_API_ThreatMatchRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRulePatchProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose,
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId,
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType,
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    id: Security_Detections_API_RuleObjectId,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields,
    license: Security_Detections_API_RuleLicense,
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata,
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace,
    note: Security_Detections_API_InvestigationGuide,
    outcome: Security_Detections_API_SavedObjectResolveOutcome,
    output_index: Security_Detections_API_AlertsIndex,
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_name_override: Security_Detections_API_RuleNameOverride,
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle,
    timeline_id: Security_Detections_API_TimelineTemplateId,
    timeline_title: Security_Detections_API_TimelineTemplateTitle,
    timestamp_override: Security_Detections_API_TimestampOverride,
    timestamp_override_fallback_disabled: Security_Detections_API_TimestampOverrideFallbackDisabled,
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_ThreatMatchRulePatchFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRulePatchFields = z
  .object({
    anomaly_threshold: Security_Detections_API_AnomalyThreshold.int().gte(0),
    machine_learning_job_id: Security_Detections_API_MachineLearningJobId,
    type: z.literal('machine_learning'),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_MachineLearningRuleOptionalFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRulePatchProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose,
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId,
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType,
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    id: Security_Detections_API_RuleObjectId,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields,
    license: Security_Detections_API_RuleLicense,
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata,
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace,
    note: Security_Detections_API_InvestigationGuide,
    outcome: Security_Detections_API_SavedObjectResolveOutcome,
    output_index: Security_Detections_API_AlertsIndex,
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_name_override: Security_Detections_API_RuleNameOverride,
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle,
    timeline_id: Security_Detections_API_TimelineTemplateId,
    timeline_title: Security_Detections_API_TimelineTemplateTitle,
    timestamp_override: Security_Detections_API_TimestampOverride,
    timestamp_override_fallback_disabled: Security_Detections_API_TimestampOverrideFallbackDisabled,
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_MachineLearningRulePatchFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRuleDefaultableFields = z
  .object({ language: Security_Detections_API_KqlQueryLanguage })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRulePatchFields = z
  .object({
    history_window_start: Security_Detections_API_HistoryWindowStart.min(1),
    new_terms_fields: Security_Detections_API_NewTermsFields.min(1).max(3),
    query: Security_Detections_API_RuleQuery,
    type: z.literal('new_terms'),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_NewTermsRuleOptionalFields)
  .and(Security_Detections_API_NewTermsRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRulePatchProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose,
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId,
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType,
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    id: Security_Detections_API_RuleObjectId,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields,
    license: Security_Detections_API_RuleLicense,
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata,
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace,
    note: Security_Detections_API_InvestigationGuide,
    outcome: Security_Detections_API_SavedObjectResolveOutcome,
    output_index: Security_Detections_API_AlertsIndex,
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_name_override: Security_Detections_API_RuleNameOverride,
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle,
    timeline_id: Security_Detections_API_TimelineTemplateId,
    timeline_title: Security_Detections_API_TimelineTemplateTitle,
    timestamp_override: Security_Detections_API_TimestampOverride,
    timestamp_override_fallback_disabled: Security_Detections_API_TimestampOverrideFallbackDisabled,
    to: Security_Detections_API_RuleIntervalTo,
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_NewTermsRulePatchFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlRulePatchProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose,
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId,
    author: Security_Detections_API_RuleAuthorArray,
    building_block_type: Security_Detections_API_BuildingBlockType,
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled,
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList),
    false_positives: Security_Detections_API_RuleFalsePositiveArray,
    from: Security_Detections_API_RuleIntervalFrom,
    id: Security_Detections_API_RuleObjectId,
    interval: Security_Detections_API_RuleInterval,
    investigation_fields: Security_Detections_API_InvestigationFields,
    language: Security_Detections_API_EsqlQueryLanguage,
    license: Security_Detections_API_RuleLicense,
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).default(100),
    meta: Security_Detections_API_RuleMetadata,
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace,
    note: Security_Detections_API_InvestigationGuide,
    outcome: Security_Detections_API_SavedObjectResolveOutcome,
    output_index: Security_Detections_API_AlertsIndex,
    query: Security_Detections_API_RuleQuery,
    references: Security_Detections_API_RuleReferenceArray,
    related_integrations: Security_Detections_API_RelatedIntegrationArray,
    required_fields: z.array(Security_Detections_API_RequiredFieldInput),
    response_actions: z.array(Security_Detections_API_ResponseAction),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping,
    rule_id: Security_Detections_API_RuleSignatureId,
    rule_name_override: Security_Detections_API_RuleNameOverride,
    setup: Security_Detections_API_SetupGuide,
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping,
    tags: Security_Detections_API_RuleTagArray,
    threat: Security_Detections_API_ThreatArray,
    throttle: Security_Detections_API_RuleActionThrottle,
    timeline_id: Security_Detections_API_TimelineTemplateId,
    timeline_title: Security_Detections_API_TimelineTemplateTitle,
    timestamp_override: Security_Detections_API_TimestampOverride,
    timestamp_override_fallback_disabled: Security_Detections_API_TimestampOverrideFallbackDisabled,
    to: Security_Detections_API_RuleIntervalTo,
    type: z.literal('esql'),
    version: Security_Detections_API_RuleVersion.int().gte(1),
  })
  .partial()
  .passthrough()
  .and(Security_Detections_API_EsqlRuleOptionalFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RulePatchProps: z.ZodType<any> = z.union([
  Security_Detections_API_EqlRulePatchProps,
  Security_Detections_API_QueryRulePatchProps,
  Security_Detections_API_SavedQueryRulePatchProps,
  Security_Detections_API_ThresholdRulePatchProps,
  Security_Detections_API_ThreatMatchRulePatchProps,
  Security_Detections_API_MachineLearningRulePatchProps,
  Security_Detections_API_NewTermsRulePatchProps,
  Security_Detections_API_EsqlRulePatchProps,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlRuleCreateFields =
  Security_Detections_API_EqlRequiredFields.and(Security_Detections_API_EqlOptionalFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlRuleCreateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_EqlRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRuleCreateFields =
  Security_Detections_API_QueryRuleRequiredFields.and(
    Security_Detections_API_QueryRuleOptionalFields
  ).and(Security_Detections_API_QueryRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRuleCreateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_QueryRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRuleCreateFields =
  Security_Detections_API_SavedQueryRuleRequiredFields.and(
    Security_Detections_API_SavedQueryRuleOptionalFields
  ).and(Security_Detections_API_SavedQueryRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRuleCreateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_SavedQueryRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRuleCreateFields =
  Security_Detections_API_ThresholdRuleRequiredFields.and(
    Security_Detections_API_ThresholdRuleOptionalFields
  ).and(Security_Detections_API_ThresholdRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRuleCreateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_ThresholdRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRuleCreateFields =
  Security_Detections_API_ThreatMatchRuleRequiredFields.and(
    Security_Detections_API_ThreatMatchRuleOptionalFields
  ).and(Security_Detections_API_ThreatMatchRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRuleCreateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_ThreatMatchRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRuleCreateFields =
  Security_Detections_API_MachineLearningRuleRequiredFields.and(
    Security_Detections_API_MachineLearningRuleOptionalFields
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRuleCreateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_MachineLearningRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRuleCreateFields =
  Security_Detections_API_NewTermsRuleRequiredFields.and(
    Security_Detections_API_NewTermsRuleOptionalFields
  ).and(Security_Detections_API_NewTermsRuleDefaultableFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRuleCreateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_NewTermsRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlRuleCreateFields =
  Security_Detections_API_EsqlRuleOptionalFields.and(
    Security_Detections_API_EsqlRuleRequiredFields
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlRuleCreateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_EsqlRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleCreateProps: z.ZodType<any> = z.union([
  Security_Detections_API_EqlRuleCreateProps,
  Security_Detections_API_QueryRuleCreateProps,
  Security_Detections_API_SavedQueryRuleCreateProps,
  Security_Detections_API_ThresholdRuleCreateProps,
  Security_Detections_API_ThreatMatchRuleCreateProps,
  Security_Detections_API_MachineLearningRuleCreateProps,
  Security_Detections_API_NewTermsRuleCreateProps,
  Security_Detections_API_EsqlRuleCreateProps,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EqlRuleUpdateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    id: Security_Detections_API_RuleObjectId.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_EqlRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_QueryRuleUpdateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    id: Security_Detections_API_RuleObjectId.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_QueryRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SavedQueryRuleUpdateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    id: Security_Detections_API_RuleObjectId.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_SavedQueryRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThresholdRuleUpdateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    id: Security_Detections_API_RuleObjectId.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_ThresholdRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThreatMatchRuleUpdateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    id: Security_Detections_API_RuleObjectId.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_ThreatMatchRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MachineLearningRuleUpdateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    id: Security_Detections_API_RuleObjectId.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_MachineLearningRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NewTermsRuleUpdateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    id: Security_Detections_API_RuleObjectId.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_NewTermsRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_EsqlRuleUpdateProps = z
  .object({
    actions: z.array(Security_Detections_API_RuleAction).optional(),
    alias_purpose: Security_Detections_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: Security_Detections_API_SavedObjectResolveAliasTargetId.optional(),
    author: Security_Detections_API_RuleAuthorArray.optional(),
    building_block_type: Security_Detections_API_BuildingBlockType.optional(),
    description: Security_Detections_API_RuleDescription.min(1),
    enabled: Security_Detections_API_IsRuleEnabled.optional(),
    exceptions_list: z.array(Security_Detections_API_RuleExceptionList).optional(),
    false_positives: Security_Detections_API_RuleFalsePositiveArray.optional(),
    from: Security_Detections_API_RuleIntervalFrom.optional(),
    id: Security_Detections_API_RuleObjectId.optional(),
    interval: Security_Detections_API_RuleInterval.optional(),
    investigation_fields: Security_Detections_API_InvestigationFields.optional(),
    license: Security_Detections_API_RuleLicense.optional(),
    max_signals: Security_Detections_API_MaxSignals.int().gte(1).optional().default(100),
    meta: Security_Detections_API_RuleMetadata.optional(),
    name: Security_Detections_API_RuleName.min(1),
    namespace: Security_Detections_API_AlertsIndexNamespace.optional(),
    note: Security_Detections_API_InvestigationGuide.optional(),
    outcome: Security_Detections_API_SavedObjectResolveOutcome.optional(),
    output_index: Security_Detections_API_AlertsIndex.optional(),
    references: Security_Detections_API_RuleReferenceArray.optional(),
    related_integrations: Security_Detections_API_RelatedIntegrationArray.optional(),
    required_fields: z.array(Security_Detections_API_RequiredFieldInput).optional(),
    response_actions: z.array(Security_Detections_API_ResponseAction).optional(),
    risk_score: Security_Detections_API_RiskScore.int().gte(0).lte(100),
    risk_score_mapping: Security_Detections_API_RiskScoreMapping.optional(),
    rule_id: Security_Detections_API_RuleSignatureId.optional(),
    rule_name_override: Security_Detections_API_RuleNameOverride.optional(),
    setup: Security_Detections_API_SetupGuide.optional(),
    severity: Security_Detections_API_Severity,
    severity_mapping: Security_Detections_API_SeverityMapping.optional(),
    tags: Security_Detections_API_RuleTagArray.optional(),
    threat: Security_Detections_API_ThreatArray.optional(),
    throttle: Security_Detections_API_RuleActionThrottle.optional(),
    timeline_id: Security_Detections_API_TimelineTemplateId.optional(),
    timeline_title: Security_Detections_API_TimelineTemplateTitle.optional(),
    timestamp_override: Security_Detections_API_TimestampOverride.optional(),
    timestamp_override_fallback_disabled:
      Security_Detections_API_TimestampOverrideFallbackDisabled.optional(),
    to: Security_Detections_API_RuleIntervalTo.optional(),
    version: Security_Detections_API_RuleVersion.int().gte(1).optional(),
  })
  .passthrough()
  .and(Security_Detections_API_EsqlRuleCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleUpdateProps: z.ZodType<any> = z.union([
  Security_Detections_API_EqlRuleUpdateProps,
  Security_Detections_API_QueryRuleUpdateProps,
  Security_Detections_API_SavedQueryRuleUpdateProps,
  Security_Detections_API_ThresholdRuleUpdateProps,
  Security_Detections_API_ThreatMatchRuleUpdateProps,
  Security_Detections_API_MachineLearningRuleUpdateProps,
  Security_Detections_API_NewTermsRuleUpdateProps,
  Security_Detections_API_EsqlRuleUpdateProps,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkDeleteRules = z
  .object({
    action: z.literal('delete'),
    gaps_range_end: z.string().optional(),
    gaps_range_start: z.string().optional(),
    ids: z.array(z.string()).min(1).optional(),
    query: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkDisableRules = z
  .object({
    action: z.literal('disable'),
    gaps_range_end: z.string().optional(),
    gaps_range_start: z.string().optional(),
    ids: z.array(z.string()).min(1).optional(),
    query: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkEnableRules = z
  .object({
    action: z.literal('enable'),
    gaps_range_end: z.string().optional(),
    gaps_range_start: z.string().optional(),
    ids: z.array(z.string()).min(1).optional(),
    query: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkExportRules = z
  .object({
    action: z.literal('export'),
    gaps_range_end: z.string().optional(),
    gaps_range_start: z.string().optional(),
    ids: z.array(z.string()).min(1).optional(),
    query: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkDuplicateRules = z
  .object({
    action: z.literal('duplicate'),
    duplicate: z
      .object({ include_exceptions: z.boolean(), include_expired_exceptions: z.boolean() })
      .passthrough()
      .optional(),
    gaps_range_end: z.string().optional(),
    gaps_range_start: z.string().optional(),
    ids: z.array(z.string()).min(1).optional(),
    query: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkManualRuleRun = z
  .object({
    action: z.literal('run'),
    gaps_range_end: z.string().optional(),
    gaps_range_start: z.string().optional(),
    ids: z.array(z.string()).min(1).optional(),
    query: z.string().optional(),
    run: z.object({ end_date: z.string(), start_date: z.string() }).passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkManualRuleFillGaps = z
  .object({
    action: z.literal('fill_gaps'),
    fill_gaps: z.object({ end_date: z.string(), start_date: z.string() }).passthrough(),
    gaps_range_end: z.string().optional(),
    gaps_range_start: z.string().optional(),
    ids: z.array(z.string()).min(1).optional(),
    query: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadTags = z
  .object({
    type: z.enum(['add_tags', 'delete_tags', 'set_tags']),
    value: Security_Detections_API_RuleTagArray,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadIndexPatterns = z
  .object({
    overwrite_data_views: z.boolean().optional(),
    type: z.enum(['add_index_patterns', 'delete_index_patterns', 'set_index_patterns']),
    value: Security_Detections_API_IndexPatternArray,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadInvestigationFields = z
  .object({
    type: z.enum([
      'add_investigation_fields',
      'delete_investigation_fields',
      'set_investigation_fields',
    ]),
    value: Security_Detections_API_InvestigationFields,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadTimeline = z
  .object({
    type: z.literal('set_timeline'),
    value: z
      .object({
        timeline_id: Security_Detections_API_TimelineTemplateId,
        timeline_title: Security_Detections_API_TimelineTemplateTitle,
      })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NormalizedRuleAction = z.object({
  alerts_filter: Security_Detections_API_RuleActionAlertsFilter.optional(),
  frequency: Security_Detections_API_RuleActionFrequency.optional(),
  group: Security_Detections_API_RuleActionGroup.optional(),
  id: Security_Detections_API_RuleActionId,
  params: Security_Detections_API_RuleActionParams,
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ThrottleForBulkActions = z.enum(['rule', '1h', '1d', '7d']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadRuleActions = z
  .object({
    type: z.enum(['add_rule_actions', 'set_rule_actions']),
    value: z
      .object({
        actions: z.array(Security_Detections_API_NormalizedRuleAction),
        throttle: Security_Detections_API_ThrottleForBulkActions.optional(),
      })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadSchedule = z
  .object({
    type: z.literal('set_schedule'),
    value: z
      .object({
        interval: z.string().regex(/^[1-9]\d*[smh]$/),
        lookback: z.string().regex(/^[1-9]\d*[smh]$/),
      })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadSetAlertSuppression = z
  .object({
    type: z.literal('set_alert_suppression'),
    value: Security_Detections_API_AlertSuppression,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadSetAlertSuppressionForThreshold = z
  .object({
    type: z.literal('set_alert_suppression_for_threshold'),
    value: Security_Detections_API_ThresholdAlertSuppression,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadDeleteAlertSuppression = z
  .object({ type: z.literal('delete_alert_suppression') })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayloadAlertSuppression = z.union([
  Security_Detections_API_BulkActionEditPayloadSetAlertSuppression,
  Security_Detections_API_BulkActionEditPayloadSetAlertSuppressionForThreshold,
  Security_Detections_API_BulkActionEditPayloadDeleteAlertSuppression,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionEditPayload = z.union([
  Security_Detections_API_BulkActionEditPayloadTags,
  Security_Detections_API_BulkActionEditPayloadIndexPatterns,
  Security_Detections_API_BulkActionEditPayloadInvestigationFields,
  Security_Detections_API_BulkActionEditPayloadTimeline,
  Security_Detections_API_BulkActionEditPayloadRuleActions,
  Security_Detections_API_BulkActionEditPayloadSchedule,
  Security_Detections_API_BulkActionEditPayloadAlertSuppression,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkEditRules = z
  .object({
    action: z.literal('edit'),
    edit: z.array(Security_Detections_API_BulkActionEditPayload).min(1),
    gaps_range_end: z.string().optional(),
    gaps_range_start: z.string().optional(),
    ids: z.array(z.string()).min(1).optional(),
    query: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PerformRulesBulkAction_Body = z.union([
  Security_Detections_API_BulkDeleteRules,
  Security_Detections_API_BulkDisableRules,
  Security_Detections_API_BulkEnableRules,
  Security_Detections_API_BulkExportRules,
  Security_Detections_API_BulkDuplicateRules,
  Security_Detections_API_BulkManualRuleRun,
  Security_Detections_API_BulkManualRuleFillGaps,
  Security_Detections_API_BulkEditRules,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionsDryRunErrCode = z.enum([
  'IMMUTABLE',
  'PREBUILT_CUSTOMIZATION_LICENSE',
  'MACHINE_LEARNING_AUTH',
  'MACHINE_LEARNING_INDEX_PATTERN',
  'ESQL_INDEX_PATTERN',
  'MANUAL_RULE_RUN_FEATURE',
  'MANUAL_RULE_RUN_DISABLED_RULE',
  'THRESHOLD_RULE_TYPE_IN_SUPPRESSION',
  'UNSUPPORTED_RULE_IN_SUPPRESSION_FOR_THRESHOLD',
  'RULE_FILL_GAPS_DISABLED_RULE',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RuleDetailsInError = z
  .object({ id: z.string(), name: z.string().optional() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_NormalizedRuleError = z
  .object({
    err_code: Security_Detections_API_BulkActionsDryRunErrCode.optional(),
    message: z.string(),
    rules: z.array(Security_Detections_API_RuleDetailsInError),
    status_code: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkEditSkipReason = z.literal('RULE_NOT_MODIFIED');
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkGapsFillingSkipReason = z.literal('NO_GAPS_TO_FILL');
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkActionSkipResult = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    skip_reason: z.union([
      Security_Detections_API_BulkEditSkipReason,
      Security_Detections_API_BulkGapsFillingSkipReason,
    ]),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkEditActionResults = z
  .object({
    created: z.array(Security_Detections_API_RuleResponse),
    deleted: z.array(Security_Detections_API_RuleResponse),
    skipped: z.array(Security_Detections_API_BulkActionSkipResult),
    updated: z.array(Security_Detections_API_RuleResponse),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkEditActionSummary = z
  .object({
    failed: z.number().int(),
    skipped: z.number().int(),
    succeeded: z.number().int(),
    total: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkEditActionResponse = z
  .object({
    attributes: z
      .object({
        errors: z.array(Security_Detections_API_NormalizedRuleError).optional(),
        results: Security_Detections_API_BulkEditActionResults,
        summary: Security_Detections_API_BulkEditActionSummary,
      })
      .passthrough(),
    message: z.string().optional(),
    rules_count: z.number().int().optional(),
    status_code: z.number().int().optional(),
    success: z.boolean().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_BulkExportActionResponse = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ExportRules_Body = z
  .object({
    objects: z.array(z.object({ rule_id: Security_Detections_API_RuleSignatureId }).passthrough()),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ErrorSchema = z.object({
  error: z.object({ message: z.string(), status_code: z.number().int().gte(400) }).passthrough(),
  id: z.string().optional(),
  item_id: z.string().min(1).optional(),
  list_id: z.string().min(1).optional(),
  rule_id: Security_Detections_API_RuleSignatureId.optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_WarningSchema = z
  .object({
    actionPath: z.string(),
    buttonLabel: z.string().optional(),
    message: z.string(),
    type: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_NonEmptyString = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_CreateRuleExceptionListItemComment = z
  .object({ comment: Security_Exceptions_API_NonEmptyString.min(1) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_CreateRuleExceptionListItemCommentArray = z.array(
  Security_Exceptions_API_CreateRuleExceptionListItemComment
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemDescription = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryOperator = z.enum([
  'excluded',
  'included',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryMatch = z
  .object({
    field: Security_Exceptions_API_NonEmptyString.min(1),
    operator: Security_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('match'),
    value: Security_Exceptions_API_NonEmptyString.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryMatchAny = z
  .object({
    field: Security_Exceptions_API_NonEmptyString.min(1),
    operator: Security_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('match_any'),
    value: z.array(Security_Exceptions_API_NonEmptyString).min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ListId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ListType = z.enum([
  'binary',
  'boolean',
  'byte',
  'date',
  'date_nanos',
  'date_range',
  'double',
  'double_range',
  'float',
  'float_range',
  'geo_point',
  'geo_shape',
  'half_float',
  'integer',
  'integer_range',
  'ip',
  'ip_range',
  'keyword',
  'long',
  'long_range',
  'shape',
  'short',
  'text',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryList = z
  .object({
    field: Security_Exceptions_API_NonEmptyString.min(1),
    list: z
      .object({ id: Security_Exceptions_API_ListId.min(1), type: Security_Exceptions_API_ListType })
      .passthrough(),
    operator: Security_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('list'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryExists = z
  .object({
    field: Security_Exceptions_API_NonEmptyString.min(1),
    operator: Security_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('exists'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryNestedEntryItem = z.union([
  Security_Exceptions_API_ExceptionListItemEntryMatch,
  Security_Exceptions_API_ExceptionListItemEntryMatchAny,
  Security_Exceptions_API_ExceptionListItemEntryExists,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryNested = z
  .object({
    entries: z.array(Security_Exceptions_API_ExceptionListItemEntryNestedEntryItem).min(1),
    field: Security_Exceptions_API_NonEmptyString.min(1),
    type: z.literal('nested'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryMatchWildcard = z
  .object({
    field: Security_Exceptions_API_NonEmptyString.min(1),
    operator: Security_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('wildcard'),
    value: Security_Exceptions_API_NonEmptyString.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntry = z.union([
  Security_Exceptions_API_ExceptionListItemEntryMatch,
  Security_Exceptions_API_ExceptionListItemEntryMatchAny,
  Security_Exceptions_API_ExceptionListItemEntryList,
  Security_Exceptions_API_ExceptionListItemEntryExists,
  Security_Exceptions_API_ExceptionListItemEntryNested,
  Security_Exceptions_API_ExceptionListItemEntryMatchWildcard,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemEntryArray = z.array(
  Security_Exceptions_API_ExceptionListItemEntry
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemHumanId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemMeta = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemName = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionNamespaceType = z.enum(['agnostic', 'single']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListOsType = z.enum(['linux', 'macos', 'windows']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemOsTypeArray = z.array(
  Security_Exceptions_API_ExceptionListOsType
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemTags = z.array(z.string().min(1));
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemType = z.literal('simple');
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_CreateRuleExceptionListItemProps = z
  .object({
    comments: Security_Exceptions_API_CreateRuleExceptionListItemCommentArray.optional(),
    description: Security_Exceptions_API_ExceptionListItemDescription,
    entries: Security_Exceptions_API_ExceptionListItemEntryArray,
    expire_time: z.string().datetime({ offset: true }).optional(),
    item_id: Security_Exceptions_API_ExceptionListItemHumanId.min(1).optional(),
    meta: Security_Exceptions_API_ExceptionListItemMeta.optional(),
    name: Security_Exceptions_API_ExceptionListItemName.min(1),
    namespace_type: Security_Exceptions_API_ExceptionNamespaceType.optional(),
    os_types: Security_Exceptions_API_ExceptionListItemOsTypeArray.optional(),
    tags: Security_Exceptions_API_ExceptionListItemTags.optional(),
    type: Security_Exceptions_API_ExceptionListItemType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateRuleExceptionListItems_Body = z
  .object({ items: z.array(Security_Exceptions_API_CreateRuleExceptionListItemProps) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemComment = z
  .object({
    comment: Security_Exceptions_API_NonEmptyString.min(1),
    created_at: z.string().datetime({ offset: true }),
    created_by: Security_Exceptions_API_NonEmptyString.min(1),
    id: Security_Exceptions_API_NonEmptyString.min(1),
    updated_at: z.string().datetime({ offset: true }).optional(),
    updated_by: Security_Exceptions_API_NonEmptyString.min(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemCommentArray = z.array(
  Security_Exceptions_API_ExceptionListItemComment
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemExpireTime = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItemId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListHumanId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListItem = z
  .object({
    _version: z.string().optional(),
    comments: Security_Exceptions_API_ExceptionListItemCommentArray,
    created_at: z.string().datetime({ offset: true }),
    created_by: z.string(),
    description: Security_Exceptions_API_ExceptionListItemDescription,
    entries: Security_Exceptions_API_ExceptionListItemEntryArray,
    expire_time: Security_Exceptions_API_ExceptionListItemExpireTime.datetime({
      offset: true,
    }).optional(),
    id: Security_Exceptions_API_ExceptionListItemId.min(1),
    item_id: Security_Exceptions_API_ExceptionListItemHumanId.min(1),
    list_id: Security_Exceptions_API_ExceptionListHumanId.min(1),
    meta: Security_Exceptions_API_ExceptionListItemMeta.optional(),
    name: Security_Exceptions_API_ExceptionListItemName.min(1),
    namespace_type: Security_Exceptions_API_ExceptionNamespaceType,
    os_types: Security_Exceptions_API_ExceptionListItemOsTypeArray.optional(),
    tags: Security_Exceptions_API_ExceptionListItemTags.optional(),
    tie_breaker_id: z.string(),
    type: Security_Exceptions_API_ExceptionListItemType,
    updated_at: z.string().datetime({ offset: true }),
    updated_by: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_PlatformErrorResponse = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_SiemErrorResponse = z
  .object({ message: z.string(), status_code: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RulePreviewParams = z
  .object({
    invocationCount: z.number().int(),
    timeframeEnd: z.string().datetime({ offset: true }),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const RulePreview_Body: z.ZodType<any> = z.union([
  Security_Detections_API_EqlRuleCreateProps.and(Security_Detections_API_RulePreviewParams),
  Security_Detections_API_QueryRuleCreateProps.and(Security_Detections_API_RulePreviewParams),
  Security_Detections_API_SavedQueryRuleCreateProps.and(Security_Detections_API_RulePreviewParams),
  Security_Detections_API_ThresholdRuleCreateProps.and(Security_Detections_API_RulePreviewParams),
  Security_Detections_API_ThreatMatchRuleCreateProps.and(Security_Detections_API_RulePreviewParams),
  Security_Detections_API_MachineLearningRuleCreateProps.and(
    Security_Detections_API_RulePreviewParams
  ),
  Security_Detections_API_NewTermsRuleCreateProps.and(Security_Detections_API_RulePreviewParams),
  Security_Detections_API_EsqlRuleCreateProps.and(Security_Detections_API_RulePreviewParams),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RulePreviewLoggedRequest = z
  .object({
    description: Security_Detections_API_NonEmptyString.min(1),
    duration: z.number().int(),
    request: Security_Detections_API_NonEmptyString.min(1),
    request_type: Security_Detections_API_NonEmptyString.min(1),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_RulePreviewLogs = z
  .object({
    duration: z.number().int(),
    errors: z.array(Security_Detections_API_NonEmptyString),
    requests: z.array(Security_Detections_API_RulePreviewLoggedRequest).optional(),
    startedAt: Security_Detections_API_NonEmptyString.min(1).optional(),
    warnings: z.array(Security_Detections_API_NonEmptyString),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertAssignees = z
  .object({ add: z.array(z.string().min(1)), remove: z.array(z.string().min(1)) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertIds = z.array(z.string().min(1));
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SetAlertAssignees_Body = z
  .object({
    assignees: Security_Detections_API_AlertAssignees,
    ids: Security_Detections_API_AlertIds.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertsSortCombinations = z.union([
  z.string(),
  z.object({}).partial().passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertsSort = z.union([
  Security_Detections_API_AlertsSortCombinations,
  z.array(Security_Detections_API_AlertsSortCombinations),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SearchAlerts_Body = z
  .object({
    _source: z.union([z.boolean(), z.string(), z.array(z.string())]),
    aggs: z.object({}).partial().passthrough(),
    fields: z.array(z.string()),
    query: z.object({}).partial().passthrough(),
    runtime_mappings: z.object({}).partial().passthrough(),
    size: z.number().int().gte(0),
    sort: Security_Detections_API_AlertsSort,
    track_total_hits: z.boolean(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_ReasonEnum = z.enum([
  'false_positive',
  'duplicate',
  'true_positive',
  'benign_positive',
  'automated_closure',
  'other',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_CloseAlertsByIds = z
  .object({
    reason: Security_Detections_API_ReasonEnum.optional(),
    signal_ids: z.array(z.string().min(1)).min(1),
    status: z.literal('closed'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertStatusExceptClosed = z.enum([
  'open',
  'acknowledged',
  'in-progress',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SetAlertsStatusByIdsBase = z
  .object({
    signal_ids: z.array(z.string().min(1)).min(1),
    status: Security_Detections_API_AlertStatusExceptClosed,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SetAlertsStatusByIds = z.discriminatedUnion('status', [
  Security_Detections_API_CloseAlertsByIds,
  Security_Detections_API_SetAlertsStatusByIdsBase,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_CloseAlertsByQuery = z
  .object({
    conflicts: z.enum(['abort', 'proceed']).optional().default('abort'),
    query: z.object({}).partial().passthrough(),
    reason: Security_Detections_API_ReasonEnum.optional(),
    status: z.literal('closed'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SetAlertsStatusByQueryBase = z
  .object({
    conflicts: z.enum(['abort', 'proceed']).optional().default('abort'),
    query: z.object({}).partial().passthrough(),
    status: Security_Detections_API_AlertStatusExceptClosed,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SetAlertsStatusByQuery = z.discriminatedUnion('status', [
  Security_Detections_API_CloseAlertsByQuery,
  Security_Detections_API_SetAlertsStatusByQueryBase,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SetAlertsStatus_Body = z.union([
  Security_Detections_API_SetAlertsStatusByIds,
  Security_Detections_API_SetAlertsStatusByQuery,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertTag = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertTags = z.array(Security_Detections_API_AlertTag);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SetAlertTags = z
  .object({
    tags_to_add: Security_Detections_API_AlertTags,
    tags_to_remove: Security_Detections_API_AlertTags,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SetAlertTags_Body = z
  .object({
    ids: Security_Detections_API_AlertIds.min(1),
    tags: Security_Detections_API_SetAlertTags,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Saved_objects_400_response = z
  .object({ error: z.literal('Bad Request'), message: z.string(), statusCode: z.literal(400) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListDescription = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListHumanId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListMeta = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListName = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionNamespaceType = z.enum([
  'agnostic',
  'single',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListOsType = z.enum([
  'linux',
  'macos',
  'windows',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListOsTypeArray = z.array(
  Security_Endpoint_Exceptions_API_ExceptionListOsType
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListTags = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListType = z.enum([
  'detection',
  'rule_default',
  'endpoint',
  'endpoint_trusted_apps',
  'endpoint_trusted_devices',
  'endpoint_events',
  'endpoint_host_isolation_exceptions',
  'endpoint_blocklists',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListVersion = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionList = z
  .object({
    _version: z.string().optional(),
    created_at: z.string().datetime({ offset: true }),
    created_by: z.string(),
    description: Security_Endpoint_Exceptions_API_ExceptionListDescription,
    id: Security_Endpoint_Exceptions_API_ExceptionListId.min(1),
    immutable: z.boolean(),
    list_id: Security_Endpoint_Exceptions_API_ExceptionListHumanId.min(1),
    meta: Security_Endpoint_Exceptions_API_ExceptionListMeta.optional(),
    name: Security_Endpoint_Exceptions_API_ExceptionListName,
    namespace_type: Security_Endpoint_Exceptions_API_ExceptionNamespaceType,
    os_types: Security_Endpoint_Exceptions_API_ExceptionListOsTypeArray.optional(),
    tags: Security_Endpoint_Exceptions_API_ExceptionListTags.optional(),
    tie_breaker_id: z.string(),
    type: Security_Endpoint_Exceptions_API_ExceptionListType,
    updated_at: z.string().datetime({ offset: true }),
    updated_by: z.string(),
    version: Security_Endpoint_Exceptions_API_ExceptionListVersion.int().gte(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_EndpointList = z.union([
  Security_Endpoint_Exceptions_API_ExceptionList,
  z.object({}).partial(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_PlatformErrorResponse = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_SiemErrorResponse = z
  .object({ message: z.string(), status_code: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_NonEmptyString = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemComment = z
  .object({
    comment: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    created_at: z.string().datetime({ offset: true }),
    created_by: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    id: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    updated_at: z.string().datetime({ offset: true }).optional(),
    updated_by: Security_Endpoint_Exceptions_API_NonEmptyString.min(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemCommentArray = z.array(
  Security_Endpoint_Exceptions_API_ExceptionListItemComment
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemDescription = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryOperator = z.enum([
  'excluded',
  'included',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryMatch = z
  .object({
    field: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    operator: Security_Endpoint_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('match'),
    value: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryMatchAny = z
  .object({
    field: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    operator: Security_Endpoint_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('match_any'),
    value: z.array(Security_Endpoint_Exceptions_API_NonEmptyString).min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ListId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ListType = z.enum([
  'binary',
  'boolean',
  'byte',
  'date',
  'date_nanos',
  'date_range',
  'double',
  'double_range',
  'float',
  'float_range',
  'geo_point',
  'geo_shape',
  'half_float',
  'integer',
  'integer_range',
  'ip',
  'ip_range',
  'keyword',
  'long',
  'long_range',
  'shape',
  'short',
  'text',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryList = z
  .object({
    field: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    list: z
      .object({
        id: Security_Endpoint_Exceptions_API_ListId.min(1),
        type: Security_Endpoint_Exceptions_API_ListType,
      })
      .passthrough(),
    operator: Security_Endpoint_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('list'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryExists = z
  .object({
    field: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    operator: Security_Endpoint_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('exists'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryNestedEntryItem = z.union([
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryMatch,
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryMatchAny,
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryExists,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryNested = z
  .object({
    entries: z.array(Security_Endpoint_Exceptions_API_ExceptionListItemEntryNestedEntryItem).min(1),
    field: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    type: z.literal('nested'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryMatchWildcard = z
  .object({
    field: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
    operator: Security_Endpoint_Exceptions_API_ExceptionListItemEntryOperator,
    type: z.literal('wildcard'),
    value: Security_Endpoint_Exceptions_API_NonEmptyString.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntry = z.union([
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryMatch,
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryMatchAny,
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryList,
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryExists,
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryNested,
  Security_Endpoint_Exceptions_API_ExceptionListItemEntryMatchWildcard,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemEntryArray = z.array(
  Security_Endpoint_Exceptions_API_ExceptionListItemEntry
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemExpireTime = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemHumanId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemMeta = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemName = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemOsTypeArray = z.array(
  Security_Endpoint_Exceptions_API_ExceptionListOsType
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemTags = z.array(z.string().min(1));
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItemType = z.literal('simple');
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_ExceptionListItem = z
  .object({
    _version: z.string().optional(),
    comments: Security_Endpoint_Exceptions_API_ExceptionListItemCommentArray,
    created_at: z.string().datetime({ offset: true }),
    created_by: z.string(),
    description: Security_Endpoint_Exceptions_API_ExceptionListItemDescription,
    entries: Security_Endpoint_Exceptions_API_ExceptionListItemEntryArray,
    expire_time: Security_Endpoint_Exceptions_API_ExceptionListItemExpireTime.datetime({
      offset: true,
    }).optional(),
    id: Security_Endpoint_Exceptions_API_ExceptionListItemId.min(1),
    item_id: Security_Endpoint_Exceptions_API_ExceptionListItemHumanId.min(1),
    list_id: Security_Endpoint_Exceptions_API_ExceptionListHumanId.min(1),
    meta: Security_Endpoint_Exceptions_API_ExceptionListItemMeta.optional(),
    name: Security_Endpoint_Exceptions_API_ExceptionListItemName.min(1),
    namespace_type: Security_Endpoint_Exceptions_API_ExceptionNamespaceType,
    os_types: Security_Endpoint_Exceptions_API_ExceptionListItemOsTypeArray.optional(),
    tags: Security_Endpoint_Exceptions_API_ExceptionListItemTags.optional(),
    tie_breaker_id: z.string(),
    type: Security_Endpoint_Exceptions_API_ExceptionListItemType,
    updated_at: z.string().datetime({ offset: true }),
    updated_by: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateEndpointListItem_Body = z
  .object({
    comments: Security_Endpoint_Exceptions_API_ExceptionListItemCommentArray.optional(),
    description: Security_Endpoint_Exceptions_API_ExceptionListItemDescription,
    entries: Security_Endpoint_Exceptions_API_ExceptionListItemEntryArray,
    item_id: Security_Endpoint_Exceptions_API_ExceptionListItemHumanId.min(1).optional(),
    meta: Security_Endpoint_Exceptions_API_ExceptionListItemMeta.optional(),
    name: Security_Endpoint_Exceptions_API_ExceptionListItemName.min(1),
    os_types: Security_Endpoint_Exceptions_API_ExceptionListItemOsTypeArray.optional(),
    tags: Security_Endpoint_Exceptions_API_ExceptionListItemTags.optional(),
    type: Security_Endpoint_Exceptions_API_ExceptionListItemType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const UpdateEndpointListItem_Body = z
  .object({
    _version: z.string().optional(),
    comments: Security_Endpoint_Exceptions_API_ExceptionListItemCommentArray.optional(),
    description: Security_Endpoint_Exceptions_API_ExceptionListItemDescription,
    entries: Security_Endpoint_Exceptions_API_ExceptionListItemEntryArray,
    id: Security_Endpoint_Exceptions_API_ExceptionListItemId.min(1).optional(),
    item_id: Security_Endpoint_Exceptions_API_ExceptionListItemHumanId.min(1).optional(),
    meta: Security_Endpoint_Exceptions_API_ExceptionListItemMeta.optional(),
    name: Security_Endpoint_Exceptions_API_ExceptionListItemName.min(1),
    os_types: Security_Endpoint_Exceptions_API_ExceptionListItemOsTypeArray.optional(),
    tags: Security_Endpoint_Exceptions_API_ExceptionListItemTags.optional(),
    type: Security_Endpoint_Exceptions_API_ExceptionListItemType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Command = z.enum([
  'isolate',
  'unisolate',
  'kill-process',
  'suspend-process',
  'running-processes',
  'get-file',
  'execute',
  'upload',
  'scan',
]);

export const agentIds = z.union([z.array(z.string().min(1)), z.string()]).optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Type = z.enum(['automated', 'manual']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_GetEndpointActionListResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_AgentIds = z.union([
  z.array(z.string().min(1)),
  z.string(),
]);

export const query = z
  .object({ agent_ids: Security_Endpoint_Management_API_AgentIds })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_AgentId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_PendingActionDataType = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_PendingActionsSchema = z.union([
  z
    .object({
      execute: Security_Endpoint_Management_API_PendingActionDataType.int(),
      'get-file': Security_Endpoint_Management_API_PendingActionDataType.int(),
      isolate: Security_Endpoint_Management_API_PendingActionDataType.int(),
      'kill-process': Security_Endpoint_Management_API_PendingActionDataType.int(),
      'running-processes': Security_Endpoint_Management_API_PendingActionDataType.int(),
      scan: Security_Endpoint_Management_API_PendingActionDataType.int(),
      'suspend-process': Security_Endpoint_Management_API_PendingActionDataType.int(),
      unisolate: Security_Endpoint_Management_API_PendingActionDataType.int(),
      upload: Security_Endpoint_Management_API_PendingActionDataType.int(),
    })
    .partial()
    .passthrough(),
  z.object({}).partial().passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_ActionStatusSuccessResponse = z
  .object({
    body: z
      .object({
        data: z
          .object({
            agent_id: Security_Endpoint_Management_API_AgentId,
            pending_actions: Security_Endpoint_Management_API_PendingActionsSchema,
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_GetEndpointActionResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_SuccessResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_AgentTypes = z.enum([
  'endpoint',
  'sentinel_one',
  'crowdstrike',
  'microsoft_defender_endpoint',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Comment = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_EndpointIds = z.array(z.string().min(1));
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Parameters = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_CancelRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough()
  .and(z.object({ parameters: z.object({ id: z.string().min(1) }).passthrough() }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_ResponseActionCreateSuccessResponse = z
  .object({
    data: z
      .object({
        agents: z.object({}).partial().passthrough(),
        agentState: z.record(
          z
            .object({
              completedAt: z.string(),
              isCompleted: z.boolean(),
              wasSuccessful: z.boolean(),
            })
            .partial()
            .passthrough()
        ),
        agentType: z.string(),
        command: z.string(),
        createdBy: z.string(),
        hosts: z.record(z.object({ name: z.string() }).partial().passthrough()),
        id: z.string(),
        isComplete: z.boolean(),
        isExpired: z.boolean(),
        outputs: z.record(
          z
            .object({
              content: z.union([z.object({}).partial().passthrough(), z.string()]),
              type: z.enum(['json', 'text']),
            })
            .passthrough()
        ),
        parameters: z.object({}).partial().passthrough(),
        startedAt: z.string(),
        status: z.string(),
        wasSuccessful: z.boolean(),
      })
      .partial()
      .passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Timeout = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_ExecuteRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough()
  .and(
    z
      .object({
        parameters: z
          .object({
            command: Security_Endpoint_Management_API_Command,
            timeout: Security_Endpoint_Management_API_Timeout.int().gte(1).optional(),
          })
          .passthrough(),
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_ExecuteRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_GetFileRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough()
  .and(z.object({ parameters: z.object({ path: z.string() }).passthrough() }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_GetFileRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const EndpointIsolateAction_Body = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_IsolateRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_KillProcessRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough()
  .and(
    z
      .object({
        parameters: z.union([
          z
            .object({ pid: z.number().int().gte(1) })
            .partial()
            .passthrough(),
          z
            .object({ entity_id: z.string().min(1) })
            .partial()
            .passthrough(),
          z
            .object({ process_name: z.string().min(1) })
            .partial()
            .passthrough(),
        ]),
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_KillProcessRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_GetProcessesRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_GetProcessesRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_RawScriptParameters = z
  .object({
    commandLine: z.string().min(1).optional(),
    raw: z.string().min(1),
    timeout: z.number().int().gte(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_HostPathScriptParameters = z
  .object({
    commandLine: z.string().min(1).optional(),
    hostPath: z.string().min(1),
    timeout: z.number().int().gte(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_CloudFileScriptParameters = z
  .object({
    cloudFile: z.string().min(1),
    commandLine: z.string().min(1).optional(),
    timeout: z.number().int().gte(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_SentinelOneRunScriptParameters = z
  .object({ inputParams: z.string().min(1).optional(), script: z.string().min(1) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_MDERunScriptParameters = z
  .object({ args: z.string().min(1).optional(), scriptName: z.string().min(1) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_RunScriptRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough()
  .and(
    z
      .object({
        parameters: z.union([
          Security_Endpoint_Management_API_RawScriptParameters,
          Security_Endpoint_Management_API_HostPathScriptParameters,
          Security_Endpoint_Management_API_CloudFileScriptParameters,
          Security_Endpoint_Management_API_SentinelOneRunScriptParameters,
          Security_Endpoint_Management_API_MDERunScriptParameters,
        ]),
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_ScanRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough()
  .and(z.object({ parameters: z.object({ path: z.string() }).passthrough() }).passthrough());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_ScanRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_ActionStateSuccessResponse = z
  .object({
    body: z
      .object({ data: z.object({ canEncrypt: z.boolean() }).partial().passthrough() })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_SuspendProcessRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough()
  .and(
    z
      .object({
        parameters: z.union([
          z
            .object({ pid: z.number().int().gte(1) })
            .partial()
            .passthrough(),
          z
            .object({ entity_id: z.string().min(1) })
            .partial()
            .passthrough(),
        ]),
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_SuspendProcessRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_UnisolateRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_UploadRouteRequestBody = z
  .object({
    agent_type: Security_Endpoint_Management_API_AgentTypes.optional(),
    alert_ids: z.array(z.string().min(1)).min(1).optional(),
    case_ids: z.array(z.string().min(1)).min(1).optional(),
    comment: Security_Endpoint_Management_API_Comment.optional(),
    endpoint_ids: Security_Endpoint_Management_API_EndpointIds.min(1),
    parameters: Security_Endpoint_Management_API_Parameters.optional(),
  })
  .passthrough()
  .and(
    z
      .object({
        file: z.any(),
        parameters: z
          .object({ overwrite: z.boolean().default(false) })
          .partial()
          .passthrough(),
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_UploadRouteResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_MetadataListResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_EndpointMetadataResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const query__2 = z
  .object({ agentId: Security_Endpoint_Management_API_AgentId })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_ProtectionUpdatesNoteResponse = z
  .object({ note: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_PrivilegeMonitoringEngineStatus = z.enum([
  'started',
  'error',
  'disabled',
  'not_installed',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_MonitoringEngineDescriptor = z
  .object({
    error: z.object({ message: z.string() }).partial().passthrough().optional(),
    status: Security_Entity_Analytics_API_PrivilegeMonitoringEngineStatus,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EntityAnalyticsPrivileges = z
  .object({
    has_all_required: z.boolean(),
    has_read_permissions: z.boolean().optional(),
    has_write_permissions: z.boolean().optional(),
    privileges: z
      .object({
        elasticsearch: z
          .object({ cluster: z.record(z.boolean()), index: z.record(z.record(z.boolean())) })
          .partial()
          .passthrough(),
        kibana: z.record(z.boolean()).optional(),
      })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_UserName = z
  .object({ user: z.object({ name: z.string() }).partial().passthrough() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_MonitoredUserUpdateDoc = z
  .object({
    entity_analytics_monitoring: z
      .object({
        labels: z.array(
          z
            .object({ field: z.string(), source: z.string(), value: z.string() })
            .partial()
            .passthrough()
        ),
      })
      .partial()
      .passthrough(),
    id: z.string(),
    labels: z
      .object({
        source_ids: z.array(z.string()),
        source_integrations: z.array(z.string()),
        sources: z.array(z.unknown()),
      })
      .partial()
      .passthrough(),
    user: z.object({ is_privileged: z.boolean(), name: z.string() }).partial().passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_MonitoredUserDoc =
  Security_Entity_Analytics_API_MonitoredUserUpdateDoc.and(
    z
      .object({
        '@timestamp': z.string().datetime({ offset: true }),
        event: z
          .object({ ingested: z.string().datetime({ offset: true }) })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_PrivmonUserCsvUploadErrorItem = z
  .object({
    index: z.number().int().nullable(),
    message: z.string(),
    username: z.string().nullable(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_PrivmonUserCsvUploadStats = z
  .object({ failed: z.number().int(), successful: z.number().int(), total: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_Interval = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EntityType = z.enum([
  'user',
  'host',
  'service',
  'generic',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_IndexPattern = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const InitEntityStore_Body = z
  .object({
    delay: z
      .string()
      .regex(/[smdh]$/)
      .default('1m'),
    docsPerSecond: z.number().int().default(-1),
    enrichPolicyExecutionInterval: Security_Entity_Analytics_API_Interval.regex(/^[1-9]\d*[smh]$/),
    entityTypes: z.array(Security_Entity_Analytics_API_EntityType),
    fieldHistoryLength: z.number().int().default(10),
    filter: z.string(),
    frequency: z
      .string()
      .regex(/[smdh]$/)
      .default('1m'),
    indexPattern: Security_Entity_Analytics_API_IndexPattern,
    lookbackPeriod: z
      .string()
      .regex(/[smdh]$/)
      .default('3h'),
    maxPageSearchSize: z.number().int().default(500),
    timeout: z
      .string()
      .regex(/[smdh]$/)
      .default('180s'),
    timestampField: z.string().default('@timestamp'),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EngineStatus = z.enum([
  'installing',
  'started',
  'stopped',
  'updating',
  'error',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EngineDescriptor = z
  .object({
    delay: z
      .string()
      .regex(/[smdh]$/)
      .optional()
      .default('1m'),
    docsPerSecond: z.number().int().optional(),
    error: z
      .object({ action: z.literal('init'), message: z.string() })
      .passthrough()
      .optional(),
    fieldHistoryLength: z.number().int(),
    filter: z.string().optional(),
    frequency: z
      .string()
      .regex(/[smdh]$/)
      .optional()
      .default('1m'),
    indexPattern: Security_Entity_Analytics_API_IndexPattern,
    lookbackPeriod: z
      .string()
      .regex(/[smdh]$/)
      .optional()
      .default('24h'),
    status: Security_Entity_Analytics_API_EngineStatus,
    timeout: z
      .string()
      .regex(/[smdh]$/)
      .optional()
      .default('180s'),
    timestampField: z.string().optional(),
    type: Security_Entity_Analytics_API_EntityType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const InitEntityEngine_Body = z
  .object({
    delay: z
      .string()
      .regex(/[smdh]$/)
      .default('1m'),
    docsPerSecond: z.number().int().default(-1),
    enrichPolicyExecutionInterval: Security_Entity_Analytics_API_Interval.regex(/^[1-9]\d*[smh]$/),
    fieldHistoryLength: z.number().int().default(10),
    filter: z.string(),
    frequency: z
      .string()
      .regex(/[smdh]$/)
      .default('1m'),
    indexPattern: Security_Entity_Analytics_API_IndexPattern,
    lookbackPeriod: z
      .string()
      .regex(/[smdh]$/)
      .default('3h'),
    maxPageSearchSize: z.number().int().default(500),
    timeout: z
      .string()
      .regex(/[smdh]$/)
      .default('180s'),
    timestampField: z.string().default('@timestamp'),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EngineDataviewUpdateResult = z
  .object({
    changes: z
      .object({ indexPatterns: z.array(z.string()) })
      .partial()
      .passthrough()
      .optional(),
    type: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_Asset = z
  .object({
    business_unit: z.string(),
    criticality: Security_Entity_Analytics_API_AssetCriticalityLevel,
    environment: z.string(),
    id: z.string(),
    model: z.string(),
    name: z.string(),
    owner: z.string(),
    serial_number: z.string(),
    vendor: z.string(),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EngineMetadata = z.object({ Type: z.string() });
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EntityRiskLevels = z.enum([
  'Unknown',
  'Low',
  'Moderate',
  'High',
  'Critical',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EntityField = z.object({
  attributes: z
    .object({
      asset: z.boolean(),
      managed: z.boolean(),
      mfa_enabled: z.boolean(),
      privileged: z.boolean(),
    })
    .partial()
    .optional(),
  behaviors: z
    .object({
      brute_force_victim: z.boolean(),
      new_country_login: z.boolean(),
      used_usb_device: z.boolean(),
    })
    .partial()
    .optional(),
  EngineMetadata: Security_Entity_Analytics_API_EngineMetadata.optional(),
  id: z.string(),
  lifecycle: z
    .object({
      first_seen: z.string().datetime({ offset: true }),
      last_activity: z.string().datetime({ offset: true }),
    })
    .partial()
    .optional(),
  name: z.string().optional(),
  relationships: z
    .object({
      accessed_frequently_by: z.array(z.string()),
      accesses_frequently: z.array(z.string()),
      communicates_with: z.array(z.string()),
      dependent_of: z.array(z.string()),
      depends_on: z.array(z.string()),
      owned_by: z.array(z.string()),
      owns: z.array(z.string()),
      supervised_by: z.array(z.string()),
      supervises: z.array(z.string()),
    })
    .partial()
    .optional(),
  risk: z
    .object({
      calculated_level: Security_Entity_Analytics_API_EntityRiskLevels,
      calculated_score: z.number(),
      calculated_score_norm: z.number().gte(0).lte(100),
    })
    .partial()
    .optional(),
  source: z.string().optional(),
  sub_type: z.string().optional(),
  type: z.string().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_RiskScoreInput = z
  .object({
    category: z.string(),
    contribution_score: z.number().optional(),
    description: z.string(),
    id: z.string(),
    index: z.string(),
    risk_score: z.number().gte(0).lte(100).optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EntityRiskScoreRecord = z
  .object({
    '@timestamp': z.string().datetime({ offset: true }),
    calculated_level: Security_Entity_Analytics_API_EntityRiskLevels,
    calculated_score: z.number(),
    calculated_score_norm: z.number().gte(0).lte(100),
    category_1_count: z.number().int(),
    category_1_score: z.number(),
    category_2_count: z.number().int().optional(),
    category_2_score: z.number().optional(),
    criticality_level: Security_Entity_Analytics_API_AssetCriticalityLevel.optional(),
    criticality_modifier: z.number().optional(),
    id_field: z.string(),
    id_value: z.string(),
    inputs: z.array(Security_Entity_Analytics_API_RiskScoreInput),
    notes: z.array(z.string()),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_UserEntity = z.object({
  '@timestamp': z.string().datetime({ offset: true }).optional(),
  asset: Security_Entity_Analytics_API_Asset.optional(),
  entity: Security_Entity_Analytics_API_EntityField,
  event: z
    .object({ ingested: z.string().datetime({ offset: true }) })
    .partial()
    .optional(),
  user: z
    .object({
      domain: z.array(z.string()).optional(),
      email: z.array(z.string()).optional(),
      full_name: z.array(z.string()).optional(),
      hash: z.array(z.string()).optional(),
      id: z.array(z.string()).optional(),
      name: z.string(),
      risk: Security_Entity_Analytics_API_EntityRiskScoreRecord.optional(),
      roles: z.array(z.string()).optional(),
    })
    .optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_HostEntity = z.object({
  '@timestamp': z.string().datetime({ offset: true }).optional(),
  asset: Security_Entity_Analytics_API_Asset.optional(),
  entity: Security_Entity_Analytics_API_EntityField,
  event: z
    .object({ ingested: z.string().datetime({ offset: true }) })
    .partial()
    .optional(),
  host: z
    .object({
      architecture: z.array(z.string()).optional(),
      domain: z.array(z.string()).optional(),
      entity: Security_Entity_Analytics_API_EntityField.optional(),
      hostname: z.array(z.string()).optional(),
      id: z.array(z.string()).optional(),
      ip: z.array(z.string()).optional(),
      mac: z.array(z.string()).optional(),
      name: z.string(),
      risk: Security_Entity_Analytics_API_EntityRiskScoreRecord.optional(),
      type: z.array(z.string()).optional(),
    })
    .optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_ServiceEntity = z.object({
  '@timestamp': z.string().datetime({ offset: true }).optional(),
  asset: Security_Entity_Analytics_API_Asset.optional(),
  entity: Security_Entity_Analytics_API_EntityField,
  event: z
    .object({ ingested: z.string().datetime({ offset: true }) })
    .partial()
    .optional(),
  service: z
    .object({
      entity: Security_Entity_Analytics_API_EntityField.optional(),
      name: z.string(),
      risk: Security_Entity_Analytics_API_EntityRiskScoreRecord.optional(),
    })
    .optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_GenericEntity = z.object({
  '@timestamp': z.string().datetime({ offset: true }).optional(),
  asset: Security_Entity_Analytics_API_Asset.optional(),
  entity: Security_Entity_Analytics_API_EntityField,
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_Entity = z.union([
  Security_Entity_Analytics_API_UserEntity,
  Security_Entity_Analytics_API_HostEntity,
  Security_Entity_Analytics_API_ServiceEntity,
  Security_Entity_Analytics_API_GenericEntity,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_InspectQuery = z
  .object({ dsl: z.array(z.string()), response: z.array(z.string()) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_TransformStatsMetadata = z
  .object({
    delete_time_in_ms: z.number().int().optional(),
    documents_deleted: z.number().int().optional(),
    documents_indexed: z.number().int(),
    documents_processed: z.number().int(),
    exponential_avg_checkpoint_duration_ms: z.number().int(),
    exponential_avg_documents_indexed: z.number().int(),
    exponential_avg_documents_processed: z.number().int(),
    index_failures: z.number().int(),
    index_time_in_ms: z.number().int(),
    index_total: z.number().int(),
    pages_processed: z.number().int(),
    processing_time_in_ms: z.number().int(),
    processing_total: z.number().int(),
    search_failures: z.number().int(),
    search_time_in_ms: z.number().int(),
    search_total: z.number().int(),
    trigger_count: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EngineComponentResource = z.enum([
  'entity_engine',
  'entity_definition',
  'index',
  'data_stream',
  'component_template',
  'index_template',
  'ingest_pipeline',
  'enrich_policy',
  'task',
  'transform',
  'ilm_policy',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_EngineComponentStatus = z
  .object({
    errors: z
      .array(z.object({ message: z.string(), title: z.string() }).partial().passthrough())
      .optional(),
    health: z.enum(['green', 'yellow', 'red', 'unavailable', 'unknown']).optional(),
    id: z.string(),
    installed: z.boolean(),
    metadata: Security_Entity_Analytics_API_TransformStatsMetadata.optional(),
    resource: Security_Entity_Analytics_API_EngineComponentResource,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_StoreStatus = z.enum([
  'not_installed',
  'installing',
  'running',
  'stopped',
  'error',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListDescription = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListMeta = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListName = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListOsTypeArray = z.array(
  Security_Exceptions_API_ExceptionListOsType
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListTags = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListType = z.enum([
  'detection',
  'rule_default',
  'endpoint',
  'endpoint_trusted_apps',
  'endpoint_trusted_devices',
  'endpoint_events',
  'endpoint_host_isolation_exceptions',
  'endpoint_blocklists',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListVersion = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionList = z
  .object({
    _version: z.string().optional(),
    created_at: z.string().datetime({ offset: true }),
    created_by: z.string(),
    description: Security_Exceptions_API_ExceptionListDescription,
    id: Security_Exceptions_API_ExceptionListId.min(1),
    immutable: z.boolean(),
    list_id: Security_Exceptions_API_ExceptionListHumanId.min(1),
    meta: Security_Exceptions_API_ExceptionListMeta.optional(),
    name: Security_Exceptions_API_ExceptionListName,
    namespace_type: Security_Exceptions_API_ExceptionNamespaceType,
    os_types: Security_Exceptions_API_ExceptionListOsTypeArray.optional(),
    tags: Security_Exceptions_API_ExceptionListTags.optional(),
    tie_breaker_id: z.string(),
    type: Security_Exceptions_API_ExceptionListType,
    updated_at: z.string().datetime({ offset: true }),
    updated_by: z.string(),
    version: Security_Exceptions_API_ExceptionListVersion.int().gte(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateExceptionList_Body = z
  .object({
    description: Security_Exceptions_API_ExceptionListDescription,
    list_id: Security_Exceptions_API_ExceptionListHumanId.min(1).optional(),
    meta: Security_Exceptions_API_ExceptionListMeta.optional(),
    name: Security_Exceptions_API_ExceptionListName,
    namespace_type: Security_Exceptions_API_ExceptionNamespaceType.optional(),
    os_types: Security_Exceptions_API_ExceptionListOsTypeArray.optional(),
    tags: Security_Exceptions_API_ExceptionListTags.optional(),
    type: Security_Exceptions_API_ExceptionListType,
    version: Security_Exceptions_API_ExceptionListVersion.int().gte(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const UpdateExceptionList_Body = z
  .object({
    _version: z.string().optional(),
    description: Security_Exceptions_API_ExceptionListDescription,
    id: Security_Exceptions_API_ExceptionListId.min(1).optional(),
    list_id: Security_Exceptions_API_ExceptionListHumanId.min(1).optional(),
    meta: Security_Exceptions_API_ExceptionListMeta.optional(),
    name: Security_Exceptions_API_ExceptionListName,
    namespace_type: Security_Exceptions_API_ExceptionNamespaceType.optional(),
    os_types: Security_Exceptions_API_ExceptionListOsTypeArray.optional(),
    tags: Security_Exceptions_API_ExceptionListTags.optional(),
    type: Security_Exceptions_API_ExceptionListType,
    version: Security_Exceptions_API_ExceptionListVersion.int().gte(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListsImportBulkError = z
  .object({
    error: z.object({ message: z.string(), status_code: z.number().int() }).passthrough(),
    id: Security_Exceptions_API_ExceptionListId.min(1).optional(),
    item_id: Security_Exceptions_API_ExceptionListItemHumanId.min(1).optional(),
    list_id: Security_Exceptions_API_ExceptionListHumanId.min(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_ExceptionListsImportBulkErrorArray = z.array(
  Security_Exceptions_API_ExceptionListsImportBulkError
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_CreateExceptionListItemComment = z
  .object({ comment: Security_Exceptions_API_NonEmptyString.min(1) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_CreateExceptionListItemCommentArray = z.array(
  Security_Exceptions_API_CreateExceptionListItemComment
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateExceptionListItem_Body = z
  .object({
    comments: Security_Exceptions_API_CreateExceptionListItemCommentArray.optional(),
    description: Security_Exceptions_API_ExceptionListItemDescription,
    entries: Security_Exceptions_API_ExceptionListItemEntryArray,
    expire_time: Security_Exceptions_API_ExceptionListItemExpireTime.datetime({
      offset: true,
    }).optional(),
    item_id: Security_Exceptions_API_ExceptionListItemHumanId.min(1).optional(),
    list_id: Security_Exceptions_API_ExceptionListHumanId.min(1),
    meta: Security_Exceptions_API_ExceptionListItemMeta.optional(),
    name: Security_Exceptions_API_ExceptionListItemName.min(1),
    namespace_type: Security_Exceptions_API_ExceptionNamespaceType.optional(),
    os_types: Security_Exceptions_API_ExceptionListItemOsTypeArray.optional(),
    tags: Security_Exceptions_API_ExceptionListItemTags.optional(),
    type: Security_Exceptions_API_ExceptionListItemType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_UpdateExceptionListItemComment = z
  .object({
    comment: Security_Exceptions_API_NonEmptyString.min(1),
    id: Security_Exceptions_API_NonEmptyString.min(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_UpdateExceptionListItemCommentArray = z.array(
  Security_Exceptions_API_UpdateExceptionListItemComment
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const UpdateExceptionListItem_Body = z
  .object({
    _version: z.string().optional(),
    comments: Security_Exceptions_API_UpdateExceptionListItemCommentArray.optional(),
    description: Security_Exceptions_API_ExceptionListItemDescription,
    entries: Security_Exceptions_API_ExceptionListItemEntryArray,
    expire_time: Security_Exceptions_API_ExceptionListItemExpireTime.datetime({
      offset: true,
    }).optional(),
    id: Security_Exceptions_API_ExceptionListItemId.min(1).optional(),
    item_id: Security_Exceptions_API_ExceptionListItemHumanId.min(1).optional(),
    list_id: Security_Exceptions_API_ExceptionListHumanId.min(1).optional(),
    meta: Security_Exceptions_API_ExceptionListItemMeta.optional(),
    name: Security_Exceptions_API_ExceptionListItemName.min(1),
    namespace_type: Security_Exceptions_API_ExceptionNamespaceType.optional(),
    os_types: Security_Exceptions_API_ExceptionListItemOsTypeArray.optional(),
    tags: Security_Exceptions_API_ExceptionListItemTags.optional(),
    type: Security_Exceptions_API_ExceptionListItemType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateSharedExceptionList_Body = z
  .object({
    description: Security_Exceptions_API_ExceptionListDescription,
    name: Security_Exceptions_API_ExceptionListName,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agent_download_sources_Body = z.object({
  host: z.string().url(),
  id: z.string().optional(),
  is_default: z.boolean().optional().default(false),
  name: z.string(),
  proxy_id: z.string().nullish(),
  secrets: z
    .object({
      ssl: z.object({ key: z.union([z.object({ id: z.string() }), z.string()]) }).partial(),
    })
    .partial()
    .optional(),
  ssl: z
    .object({
      certificate: z.string(),
      certificate_authorities: z.array(z.string()),
      key: z.string(),
    })
    .partial()
    .optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agent_policies_Body = z.object({
  advanced_settings: z
    .object({
      agent_download_target_directory: z.unknown().nullable(),
      agent_download_timeout: z.unknown().nullable(),
      agent_limits_go_max_procs: z.unknown().nullable(),
      agent_logging_files_interval: z.unknown().nullable(),
      agent_logging_files_keepfiles: z.unknown().nullable(),
      agent_logging_files_rotateeverybytes: z.unknown().nullable(),
      agent_logging_level: z.unknown().nullable(),
      agent_logging_metrics_period: z.unknown().nullable(),
      agent_logging_to_files: z.unknown().nullable(),
      agent_monitoring_runtime_experimental: z.unknown().nullable(),
    })
    .partial()
    .optional(),
  agent_features: z.array(z.object({ enabled: z.boolean(), name: z.string() })).optional(),
  agentless: z
    .object({
      cloud_connectors: z.object({ enabled: z.boolean(), target_csp: z.string().optional() }),
      resources: z
        .object({ requests: z.object({ cpu: z.string(), memory: z.string() }).partial() })
        .partial(),
    })
    .partial()
    .optional(),
  data_output_id: z.string().nullish(),
  description: z.string().optional(),
  download_source_id: z.string().nullish(),
  fleet_server_host_id: z.string().nullish(),
  force: z.boolean().optional(),
  global_data_tags: z
    .array(z.object({ name: z.string(), value: z.union([z.string(), z.number()]) }))
    .optional(),
  has_fleet_server: z.boolean().optional(),
  id: z.string().optional(),
  inactivity_timeout: z.number().gte(0).optional().default(1209600),
  is_default: z.boolean().optional(),
  is_default_fleet_server: z.boolean().optional(),
  is_managed: z.boolean().optional(),
  is_protected: z.boolean().optional(),
  keep_monitoring_alive: z.boolean().nullish().default(false),
  monitoring_diagnostics: z
    .object({
      limit: z.object({ burst: z.number(), interval: z.string() }).partial(),
      uploader: z
        .object({ init_dur: z.string(), max_dur: z.string(), max_retries: z.number() })
        .partial(),
    })
    .partial()
    .optional(),
  monitoring_enabled: z.array(z.enum(['logs', 'metrics', 'traces'])).optional(),
  monitoring_http: z
    .object({
      buffer: z.object({ enabled: z.boolean().default(false) }).partial(),
      enabled: z.boolean(),
      host: z.string(),
      port: z.number().gte(0).lte(65353),
    })
    .partial()
    .optional(),
  monitoring_output_id: z.string().nullish(),
  monitoring_pprof_enabled: z.boolean().optional(),
  name: z.string().min(1),
  namespace: z.string().min(1),
  overrides: z.object({}).partial().passthrough().nullish(),
  required_versions: z
    .array(z.object({ percentage: z.number().gte(0).lte(100), version: z.string() }))
    .nullish(),
  space_ids: z.array(z.string()).optional(),
  supports_agentless: z.boolean().nullish().default(false),
  unenroll_timeout: z.number().gte(0).optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agent_policies_bulk_get_Body = z.object({
  full: z.boolean().optional(),
  ids: z.array(z.string()),
  ignoreMissing: z.boolean().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_agent_policies_agentpolicyid_Body = z.object({
  advanced_settings: z
    .object({
      agent_download_target_directory: z.unknown().nullable(),
      agent_download_timeout: z.unknown().nullable(),
      agent_limits_go_max_procs: z.unknown().nullable(),
      agent_logging_files_interval: z.unknown().nullable(),
      agent_logging_files_keepfiles: z.unknown().nullable(),
      agent_logging_files_rotateeverybytes: z.unknown().nullable(),
      agent_logging_level: z.unknown().nullable(),
      agent_logging_metrics_period: z.unknown().nullable(),
      agent_logging_to_files: z.unknown().nullable(),
      agent_monitoring_runtime_experimental: z.unknown().nullable(),
    })
    .partial()
    .optional(),
  agent_features: z.array(z.object({ enabled: z.boolean(), name: z.string() })).optional(),
  agentless: z
    .object({
      cloud_connectors: z.object({ enabled: z.boolean(), target_csp: z.string().optional() }),
      resources: z
        .object({ requests: z.object({ cpu: z.string(), memory: z.string() }).partial() })
        .partial(),
    })
    .partial()
    .optional(),
  bumpRevision: z.boolean().optional(),
  data_output_id: z.string().nullish(),
  description: z.string().optional(),
  download_source_id: z.string().nullish(),
  fleet_server_host_id: z.string().nullish(),
  force: z.boolean().optional(),
  global_data_tags: z
    .array(z.object({ name: z.string(), value: z.union([z.string(), z.number()]) }))
    .optional(),
  has_fleet_server: z.boolean().optional(),
  id: z.string().optional(),
  inactivity_timeout: z.number().gte(0).optional().default(1209600),
  is_default: z.boolean().optional(),
  is_default_fleet_server: z.boolean().optional(),
  is_managed: z.boolean().optional(),
  is_protected: z.boolean().optional(),
  keep_monitoring_alive: z.boolean().nullish().default(false),
  monitoring_diagnostics: z
    .object({
      limit: z.object({ burst: z.number(), interval: z.string() }).partial(),
      uploader: z
        .object({ init_dur: z.string(), max_dur: z.string(), max_retries: z.number() })
        .partial(),
    })
    .partial()
    .optional(),
  monitoring_enabled: z.array(z.enum(['logs', 'metrics', 'traces'])).optional(),
  monitoring_http: z
    .object({
      buffer: z.object({ enabled: z.boolean().default(false) }).partial(),
      enabled: z.boolean(),
      host: z.string(),
      port: z.number().gte(0).lte(65353),
    })
    .partial()
    .optional(),
  monitoring_output_id: z.string().nullish(),
  monitoring_pprof_enabled: z.boolean().optional(),
  name: z.string().min(1),
  namespace: z.string().min(1),
  overrides: z.object({}).partial().passthrough().nullish(),
  required_versions: z
    .array(z.object({ percentage: z.number().gte(0).lte(100), version: z.string() }))
    .nullish(),
  space_ids: z.array(z.string()).optional(),
  supports_agentless: z.boolean().nullish().default(false),
  unenroll_timeout: z.number().gte(0).optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agent_policies_agentpolicyid_copy_Body = z.object({
  description: z.string().optional(),
  name: z.string().min(1),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agent_policies_delete_Body = z.object({
  agentPolicyId: z.string(),
  force: z.boolean().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agent_policies_outputs_Body = z.object({ ids: z.array(z.string()) });

export const agentsIds = z.union([z.array(z.string()), z.string()]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_Body = z.object({ actionIds: z.array(z.string()) });
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_agents_agentid_Body = z
  .object({
    tags: z.array(z.string()),
    user_provided_metadata: z.object({}).partial().passthrough(),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_agentid_actions_Body = z.object({
  action: z.union([
    z.object({
      ack_data: z.unknown(),
      data: z.unknown(),
      type: z.enum(['z.any()', 'z.any()', 'z.any()']),
    }),
    z.object({
      data: z.object({ log_level: z.enum(['debug', 'info', 'warning', 'error']).nullable() }),
      type: z.literal('z.any()'),
    }),
  ]),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_agentid_request_diagnostics_Body = z
  .object({ additional_metrics: z.array(z.literal('z.any()')) })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_agentid_unenroll_Body = z
  .object({ force: z.boolean(), revoke: z.boolean() })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_agentid_upgrade_Body = z.object({
  force: z.boolean().optional(),
  skipRateLimitCheck: z.boolean().optional(),
  source_uri: z.string().optional(),
  version: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_bulk_reassign_Body = z.object({
  agents: z.union([z.array(z.string()), z.string()]),
  batchSize: z.number().optional(),
  includeInactive: z.boolean().optional().default(false),
  policy_id: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_bulk_request_diagnostics_Body = z.object({
  additional_metrics: z.array(z.literal('z.any()')).optional(),
  agents: z.union([z.array(z.string()), z.string()]),
  batchSize: z.number().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_bulk_unenroll_Body = z.object({
  agents: z.union([z.array(z.string()), z.string()]),
  batchSize: z.number().optional(),
  force: z.boolean().optional(),
  includeInactive: z.boolean().optional(),
  revoke: z.boolean().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_bulk_update_agent_tags_Body = z.object({
  agents: z.union([z.array(z.string()), z.string()]),
  batchSize: z.number().optional(),
  includeInactive: z.boolean().optional().default(false),
  tagsToAdd: z.array(z.string()).optional(),
  tagsToRemove: z.array(z.string()).optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_agents_bulk_upgrade_Body = z.object({
  agents: z.union([z.array(z.string()), z.string()]),
  batchSize: z.number().optional(),
  force: z.boolean().optional(),
  includeInactive: z.boolean().optional().default(false),
  rollout_duration_seconds: z.number().gte(600).optional(),
  skipRateLimitCheck: z.boolean().optional(),
  source_uri: z.string().optional(),
  start_time: z.string().optional(),
  version: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_cloud_connectors_Body = z.object({
  cloudProvider: z.enum(['aws', 'azure', 'gcp']),
  name: z.string().min(1).max(255),
  vars: z.record(
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.object({
        frozen: z.boolean().optional(),
        type: z.string().max(50),
        value: z.union([
          z.string(),
          z.object({ id: z.string().max(255), isSecretRef: z.boolean() }),
        ]),
      }),
    ])
  ),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_cloud_connectors_cloudconnectorid_Body = z
  .object({
    name: z.string().min(1).max(255),
    vars: z.record(
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.object({
          frozen: z.boolean().optional(),
          type: z.string().max(50),
          value: z.union([
            z.string(),
            z.object({ id: z.string().max(255), isSecretRef: z.boolean() }),
          ]),
        }),
      ])
    ),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_enrollment_api_keys_Body = z.object({
  expiration: z.string().optional(),
  name: z.string().optional(),
  policy_id: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_epm_bulk_assets_Body = z.object({
  assetIds: z.array(z.object({ id: z.string(), type: z.string() })),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_epm_custom_integrations_Body = z.object({
  datasets: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['logs', 'metrics', 'traces', 'synthetics', 'profiling']),
    })
  ),
  force: z.boolean().optional(),
  integrationName: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_epm_custom_integrations_pkgname_Body = z.object({
  categories: z.array(z.string()).optional(),
  readMeData: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_epm_packages_bulk_Body = z.object({
  force: z.boolean().optional().default(false),
  packages: z
    .array(
      z.union([
        z.string(),
        z.object({ name: z.string(), prerelease: z.boolean().optional(), version: z.string() }),
      ])
    )
    .min(1),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_epm_packages_bulk_uninstall_Body = z.object({
  force: z.boolean().optional().default(false),
  packages: z.array(z.object({ name: z.string(), version: z.string() })).min(1),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_epm_packages_bulk_upgrade_Body = z.object({
  force: z.boolean().optional().default(false),
  packages: z.array(z.object({ name: z.string(), version: z.string().optional() })).min(1),
  prerelease: z.boolean().optional(),
  upgrade_package_policies: z.boolean().optional().default(false),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_epm_packages_pkgname_pkgversion_Body = z
  .object({ force: z.boolean().default(false), ignore_constraints: z.boolean().default(false) })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_epm_packages_pkgname_pkgversion_kibana_assets_Body = z
  .object({ force: z.boolean(), space_ids: z.array(z.string()).min(1) })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_epm_packages_pkgname_pkgversion_transforms_authorize_Body = z.object({
  transforms: z.array(z.object({ transformId: z.string() })),
});

export const searchAfter = z.array(z.union([z.string(), z.number()])).optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_fleet_server_hosts_Body = z.object({
  host_urls: z.array(z.string()).min(1),
  id: z.string().optional(),
  is_default: z.boolean().optional().default(false),
  is_internal: z.boolean().optional(),
  is_preconfigured: z.boolean().optional().default(false),
  name: z.string(),
  proxy_id: z.string().nullish(),
  secrets: z
    .object({
      ssl: z
        .object({
          es_key: z.union([z.object({ id: z.string() }), z.string()]),
          key: z.union([z.object({ id: z.string() }), z.string()]),
        })
        .partial(),
    })
    .partial()
    .optional(),
  ssl: z
    .object({
      certificate: z.string(),
      certificate_authorities: z.array(z.string()),
      client_auth: z.enum(['optional', 'required', 'none']),
      es_certificate: z.string(),
      es_certificate_authorities: z.array(z.string()),
      es_key: z.string(),
      key: z.string(),
    })
    .partial()
    .nullish(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_fleet_server_hosts_itemid_Body = z.object({
  host_urls: z.array(z.string()).min(1).optional(),
  is_default: z.boolean().optional(),
  is_internal: z.boolean().optional(),
  name: z.string().optional(),
  proxy_id: z.string().nullable(),
  secrets: z
    .object({
      ssl: z
        .object({
          es_key: z.union([z.object({ id: z.string() }), z.string()]),
          key: z.union([z.object({ id: z.string() }), z.string()]),
        })
        .partial(),
    })
    .partial()
    .optional(),
  ssl: z
    .object({
      certificate: z.string(),
      certificate_authorities: z.array(z.string()),
      client_auth: z.enum(['optional', 'required', 'none']),
      es_certificate: z.string(),
      es_certificate_authorities: z.array(z.string()),
      es_key: z.string(),
      key: z.string(),
    })
    .partial()
    .nullish(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_outputs_Body = z.union([
  z.object({
    allow_edit: z.array(z.string()).optional(),
    ca_sha256: z.string().nullish(),
    ca_trusted_fingerprint: z.string().nullish(),
    config_yaml: z.string().nullish(),
    hosts: z.array(z.string().url()).min(1),
    id: z.string().optional(),
    is_default: z.boolean().optional().default(false),
    is_default_monitoring: z.boolean().optional().default(false),
    is_internal: z.boolean().optional(),
    is_preconfigured: z.boolean().optional(),
    name: z.string(),
    preset: z.enum(['balanced', 'custom', 'throughput', 'scale', 'latency']).optional(),
    proxy_id: z.string().nullish(),
    secrets: z
      .object({
        ssl: z
          .object({
            key: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
          })
          .partial(),
      })
      .partial()
      .optional(),
    shipper: z
      .object({
        compression_level: z.number().nullable(),
        disk_queue_compression_enabled: z.boolean().nullable(),
        disk_queue_enabled: z.boolean().nullish().default(false),
        disk_queue_encryption_enabled: z.boolean().nullable(),
        disk_queue_max_size: z.number().nullable(),
        disk_queue_path: z.string().nullable(),
        loadbalance: z.boolean().nullable(),
        max_batch_bytes: z.number().nullable(),
        mem_queue_events: z.number().nullable(),
        queue_flush_timeout: z.number().nullable(),
      })
      .nullish(),
    ssl: z
      .object({
        certificate: z.string(),
        certificate_authorities: z.array(z.string()),
        key: z.string(),
        verification_mode: z.enum(['full', 'none', 'certificate', 'strict']),
      })
      .partial()
      .nullish(),
    type: z.literal('elasticsearch'),
    write_to_logs_streams: z.boolean().nullish(),
  }),
  z.object({
    allow_edit: z.array(z.string()).optional(),
    ca_sha256: z.string().nullish(),
    ca_trusted_fingerprint: z.string().nullish(),
    config_yaml: z.string().nullish(),
    hosts: z.array(z.string().url()).min(1),
    id: z.string().optional(),
    is_default: z.boolean().optional().default(false),
    is_default_monitoring: z.boolean().optional().default(false),
    is_internal: z.boolean().optional(),
    is_preconfigured: z.boolean().optional(),
    kibana_api_key: z.string().nullish(),
    kibana_url: z.string().nullish(),
    name: z.string(),
    preset: z.enum(['balanced', 'custom', 'throughput', 'scale', 'latency']).optional(),
    proxy_id: z.string().nullish(),
    secrets: z
      .object({
        service_token: z.union([
          z.object({ hash: z.string().optional(), id: z.string() }),
          z.string(),
        ]),
        ssl: z
          .object({
            key: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
          })
          .partial(),
      })
      .partial()
      .optional(),
    service_token: z.string().nullish(),
    shipper: z
      .object({
        compression_level: z.number().nullable(),
        disk_queue_compression_enabled: z.boolean().nullable(),
        disk_queue_enabled: z.boolean().nullish().default(false),
        disk_queue_encryption_enabled: z.boolean().nullable(),
        disk_queue_max_size: z.number().nullable(),
        disk_queue_path: z.string().nullable(),
        loadbalance: z.boolean().nullable(),
        max_batch_bytes: z.number().nullable(),
        mem_queue_events: z.number().nullable(),
        queue_flush_timeout: z.number().nullable(),
      })
      .nullish(),
    ssl: z
      .object({
        certificate: z.string(),
        certificate_authorities: z.array(z.string()),
        key: z.string(),
        verification_mode: z.enum(['full', 'none', 'certificate', 'strict']),
      })
      .partial()
      .nullish(),
    sync_integrations: z.boolean().optional(),
    sync_uninstalled_integrations: z.boolean().optional(),
    type: z.literal('remote_elasticsearch'),
    write_to_logs_streams: z.boolean().nullish(),
  }),
  z.object({
    allow_edit: z.array(z.string()).optional(),
    ca_sha256: z.string().nullish(),
    ca_trusted_fingerprint: z.string().nullish(),
    config_yaml: z.string().nullish(),
    hosts: z.array(z.string()).min(1),
    id: z.string().optional(),
    is_default: z.boolean().optional().default(false),
    is_default_monitoring: z.boolean().optional().default(false),
    is_internal: z.boolean().optional(),
    is_preconfigured: z.boolean().optional(),
    name: z.string(),
    proxy_id: z.string().nullish(),
    secrets: z
      .object({
        ssl: z
          .object({
            key: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
          })
          .partial(),
      })
      .partial()
      .optional(),
    shipper: z
      .object({
        compression_level: z.number().nullable(),
        disk_queue_compression_enabled: z.boolean().nullable(),
        disk_queue_enabled: z.boolean().nullish().default(false),
        disk_queue_encryption_enabled: z.boolean().nullable(),
        disk_queue_max_size: z.number().nullable(),
        disk_queue_path: z.string().nullable(),
        loadbalance: z.boolean().nullable(),
        max_batch_bytes: z.number().nullable(),
        mem_queue_events: z.number().nullable(),
        queue_flush_timeout: z.number().nullable(),
      })
      .nullish(),
    ssl: z
      .object({
        certificate: z.string(),
        certificate_authorities: z.array(z.string()),
        key: z.string(),
        verification_mode: z.enum(['full', 'none', 'certificate', 'strict']),
      })
      .partial()
      .nullish(),
    type: z.literal('logstash'),
  }),
  z.object({
    allow_edit: z.array(z.string()).optional(),
    auth_type: z.enum(['none', 'user_pass', 'ssl', 'kerberos']),
    broker_timeout: z.number().optional(),
    ca_sha256: z.string().nullish(),
    ca_trusted_fingerprint: z.string().nullish(),
    client_id: z.string().optional(),
    compression: z.enum(['gzip', 'snappy', 'lz4', 'none']).optional(),
    compression_level: z.union([z.number(), z.unknown()]).nullable(),
    config_yaml: z.string().nullish(),
    connection_type: z.union([z.enum(['plaintext', 'encryption']), z.unknown()]).nullable(),
    hash: z.object({ hash: z.string(), random: z.boolean() }).partial().optional(),
    headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    hosts: z.array(z.string()).min(1),
    id: z.string().optional(),
    is_default: z.boolean().optional().default(false),
    is_default_monitoring: z.boolean().optional().default(false),
    is_internal: z.boolean().optional(),
    is_preconfigured: z.boolean().optional(),
    key: z.string().optional(),
    name: z.string(),
    partition: z.enum(['random', 'round_robin', 'hash']).optional(),
    password: z.union([z.unknown(), z.union([z.string(), z.unknown()])]).nullable(),
    proxy_id: z.string().nullish(),
    random: z.object({ group_events: z.number() }).partial().optional(),
    required_acks: z.union([z.literal(1), z.literal(0), z.literal(-1)]).optional(),
    round_robin: z.object({ group_events: z.number() }).partial().optional(),
    sasl: z
      .object({ mechanism: z.enum(['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512']) })
      .partial()
      .nullish(),
    secrets: z
      .object({
        password: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
        ssl: z.object({
          key: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
        }),
      })
      .partial()
      .optional(),
    shipper: z
      .object({
        compression_level: z.number().nullable(),
        disk_queue_compression_enabled: z.boolean().nullable(),
        disk_queue_enabled: z.boolean().nullish().default(false),
        disk_queue_encryption_enabled: z.boolean().nullable(),
        disk_queue_max_size: z.number().nullable(),
        disk_queue_path: z.string().nullable(),
        loadbalance: z.boolean().nullable(),
        max_batch_bytes: z.number().nullable(),
        mem_queue_events: z.number().nullable(),
        queue_flush_timeout: z.number().nullable(),
      })
      .nullish(),
    ssl: z
      .object({
        certificate: z.string(),
        certificate_authorities: z.array(z.string()),
        key: z.string(),
        verification_mode: z.enum(['full', 'none', 'certificate', 'strict']),
      })
      .partial()
      .nullish(),
    timeout: z.number().optional(),
    topic: z.string().optional(),
    type: z.literal('kafka'),
    username: z.union([z.string(), z.unknown()]).nullable(),
    version: z.string().optional(),
  }),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_outputs_outputid_Body = z.union([
  z
    .object({
      allow_edit: z.array(z.string()),
      ca_sha256: z.string().nullable(),
      ca_trusted_fingerprint: z.string().nullable(),
      config_yaml: z.string().nullable(),
      hosts: z.array(z.string().url()).min(1),
      id: z.string(),
      is_default: z.boolean(),
      is_default_monitoring: z.boolean(),
      is_internal: z.boolean(),
      is_preconfigured: z.boolean(),
      name: z.string(),
      preset: z.enum(['balanced', 'custom', 'throughput', 'scale', 'latency']),
      proxy_id: z.string().nullable(),
      secrets: z
        .object({
          ssl: z
            .object({
              key: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
            })
            .partial(),
        })
        .partial(),
      shipper: z
        .object({
          compression_level: z.number().nullable(),
          disk_queue_compression_enabled: z.boolean().nullable(),
          disk_queue_enabled: z.boolean().nullish().default(false),
          disk_queue_encryption_enabled: z.boolean().nullable(),
          disk_queue_max_size: z.number().nullable(),
          disk_queue_path: z.string().nullable(),
          loadbalance: z.boolean().nullable(),
          max_batch_bytes: z.number().nullable(),
          mem_queue_events: z.number().nullable(),
          queue_flush_timeout: z.number().nullable(),
        })
        .nullable(),
      ssl: z
        .object({
          certificate: z.string(),
          certificate_authorities: z.array(z.string()),
          key: z.string(),
          verification_mode: z.enum(['full', 'none', 'certificate', 'strict']),
        })
        .partial()
        .nullable(),
      type: z.literal('elasticsearch'),
      write_to_logs_streams: z.boolean().nullable(),
    })
    .partial(),
  z
    .object({
      allow_edit: z.array(z.string()),
      ca_sha256: z.string().nullable(),
      ca_trusted_fingerprint: z.string().nullable(),
      config_yaml: z.string().nullable(),
      hosts: z.array(z.string().url()).min(1),
      id: z.string(),
      is_default: z.boolean(),
      is_default_monitoring: z.boolean(),
      is_internal: z.boolean(),
      is_preconfigured: z.boolean(),
      kibana_api_key: z.string().nullable(),
      kibana_url: z.string().nullable(),
      name: z.string(),
      preset: z.enum(['balanced', 'custom', 'throughput', 'scale', 'latency']),
      proxy_id: z.string().nullable(),
      secrets: z
        .object({
          service_token: z.union([
            z.object({ hash: z.string().optional(), id: z.string() }),
            z.string(),
          ]),
          ssl: z
            .object({
              key: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
            })
            .partial(),
        })
        .partial(),
      service_token: z.string().nullable(),
      shipper: z
        .object({
          compression_level: z.number().nullable(),
          disk_queue_compression_enabled: z.boolean().nullable(),
          disk_queue_enabled: z.boolean().nullish().default(false),
          disk_queue_encryption_enabled: z.boolean().nullable(),
          disk_queue_max_size: z.number().nullable(),
          disk_queue_path: z.string().nullable(),
          loadbalance: z.boolean().nullable(),
          max_batch_bytes: z.number().nullable(),
          mem_queue_events: z.number().nullable(),
          queue_flush_timeout: z.number().nullable(),
        })
        .nullable(),
      ssl: z
        .object({
          certificate: z.string(),
          certificate_authorities: z.array(z.string()),
          key: z.string(),
          verification_mode: z.enum(['full', 'none', 'certificate', 'strict']),
        })
        .partial()
        .nullable(),
      sync_integrations: z.boolean(),
      sync_uninstalled_integrations: z.boolean(),
      type: z.literal('remote_elasticsearch'),
      write_to_logs_streams: z.boolean().nullable(),
    })
    .partial(),
  z
    .object({
      allow_edit: z.array(z.string()),
      ca_sha256: z.string().nullable(),
      ca_trusted_fingerprint: z.string().nullable(),
      config_yaml: z.string().nullable(),
      hosts: z.array(z.string()).min(1),
      id: z.string(),
      is_default: z.boolean(),
      is_default_monitoring: z.boolean(),
      is_internal: z.boolean(),
      is_preconfigured: z.boolean(),
      name: z.string(),
      proxy_id: z.string().nullable(),
      secrets: z
        .object({
          ssl: z
            .object({
              key: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
            })
            .partial(),
        })
        .partial(),
      shipper: z
        .object({
          compression_level: z.number().nullable(),
          disk_queue_compression_enabled: z.boolean().nullable(),
          disk_queue_enabled: z.boolean().nullish().default(false),
          disk_queue_encryption_enabled: z.boolean().nullable(),
          disk_queue_max_size: z.number().nullable(),
          disk_queue_path: z.string().nullable(),
          loadbalance: z.boolean().nullable(),
          max_batch_bytes: z.number().nullable(),
          mem_queue_events: z.number().nullable(),
          queue_flush_timeout: z.number().nullable(),
        })
        .nullable(),
      ssl: z
        .object({
          certificate: z.string(),
          certificate_authorities: z.array(z.string()),
          key: z.string(),
          verification_mode: z.enum(['full', 'none', 'certificate', 'strict']),
        })
        .partial()
        .nullable(),
      type: z.literal('logstash'),
    })
    .partial(),
  z.object({
    allow_edit: z.array(z.string()).optional(),
    auth_type: z.enum(['none', 'user_pass', 'ssl', 'kerberos']).optional(),
    broker_timeout: z.number().optional(),
    ca_sha256: z.string().nullish(),
    ca_trusted_fingerprint: z.string().nullish(),
    client_id: z.string().optional(),
    compression: z.enum(['gzip', 'snappy', 'lz4', 'none']).optional(),
    compression_level: z.union([z.number(), z.unknown()]).nullable(),
    config_yaml: z.string().nullish(),
    connection_type: z.union([z.enum(['plaintext', 'encryption']), z.unknown()]).nullable(),
    hash: z.object({ hash: z.string(), random: z.boolean() }).partial().optional(),
    headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    hosts: z.array(z.string()).min(1).optional(),
    id: z.string().optional(),
    is_default: z.boolean().optional().default(false),
    is_default_monitoring: z.boolean().optional().default(false),
    is_internal: z.boolean().optional(),
    is_preconfigured: z.boolean().optional(),
    key: z.string().optional(),
    name: z.string(),
    partition: z.enum(['random', 'round_robin', 'hash']).optional(),
    password: z.union([z.unknown(), z.union([z.string(), z.unknown()])]).nullable(),
    proxy_id: z.string().nullish(),
    random: z.object({ group_events: z.number() }).partial().optional(),
    required_acks: z.union([z.literal(1), z.literal(0), z.literal(-1)]).optional(),
    round_robin: z.object({ group_events: z.number() }).partial().optional(),
    sasl: z
      .object({ mechanism: z.enum(['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512']) })
      .partial()
      .nullish(),
    secrets: z
      .object({
        password: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
        ssl: z.object({
          key: z.union([z.object({ hash: z.string().optional(), id: z.string() }), z.string()]),
        }),
      })
      .partial()
      .optional(),
    shipper: z
      .object({
        compression_level: z.number().nullable(),
        disk_queue_compression_enabled: z.boolean().nullable(),
        disk_queue_enabled: z.boolean().nullish().default(false),
        disk_queue_encryption_enabled: z.boolean().nullable(),
        disk_queue_max_size: z.number().nullable(),
        disk_queue_path: z.string().nullable(),
        loadbalance: z.boolean().nullable(),
        max_batch_bytes: z.number().nullable(),
        mem_queue_events: z.number().nullable(),
        queue_flush_timeout: z.number().nullable(),
      })
      .nullish(),
    ssl: z
      .object({
        certificate: z.string(),
        certificate_authorities: z.array(z.string()),
        key: z.string(),
        verification_mode: z.enum(['full', 'none', 'certificate', 'strict']),
      })
      .partial()
      .nullish(),
    timeout: z.number().optional(),
    topic: z.string().optional(),
    type: z.literal('kafka').optional(),
    username: z.union([z.string(), z.unknown()]).nullable(),
    version: z.string().optional(),
  }),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_package_policies_Body = z.union([
  z.object({
    additional_datastreams_permissions: z.array(z.string()).nullish(),
    cloud_connector_id: z.string().nullish(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    force: z.boolean().optional(),
    id: z.string().optional(),
    inputs: z.array(
      z.object({
        config: z
          .record(
            z.object({
              frozen: z.boolean().optional(),
              type: z.string().optional(),
              value: z.unknown(),
            })
          )
          .optional(),
        enabled: z.boolean(),
        id: z.string().optional(),
        keep_enabled: z.boolean().optional(),
        policy_template: z.string().optional(),
        streams: z
          .array(
            z.object({
              compiled_stream: z.unknown(),
              config: z
                .record(
                  z.object({
                    frozen: z.boolean().optional(),
                    type: z.string().optional(),
                    value: z.unknown(),
                  })
                )
                .optional(),
              data_stream: z.object({
                dataset: z.string(),
                elasticsearch: z
                  .object({
                    dynamic_dataset: z.boolean(),
                    dynamic_namespace: z.boolean(),
                    privileges: z.object({ indices: z.array(z.string()) }).partial(),
                  })
                  .partial()
                  .optional(),
                type: z.string(),
              }),
              enabled: z.boolean(),
              id: z.string().optional(),
              keep_enabled: z.boolean().optional(),
              release: z.enum(['ga', 'beta', 'experimental']).optional(),
              vars: z
                .record(
                  z.object({
                    frozen: z.boolean().optional(),
                    type: z.string().optional(),
                    value: z.unknown(),
                  })
                )
                .optional(),
            })
          )
          .optional(),
        type: z.string(),
        vars: z
          .record(
            z.object({
              frozen: z.boolean().optional(),
              type: z.string().optional(),
              value: z.unknown(),
            })
          )
          .optional(),
      })
    ),
    is_managed: z.boolean().optional(),
    name: z.string(),
    namespace: z.string().optional(),
    output_id: z.string().nullish(),
    overrides: z
      .object({ inputs: z.object({}).partial().passthrough() })
      .partial()
      .nullish(),
    package: z
      .object({
        experimental_data_stream_features: z
          .array(
            z.object({
              data_stream: z.string(),
              features: z
                .object({
                  doc_value_only_numeric: z.boolean(),
                  doc_value_only_other: z.boolean(),
                  synthetic_source: z.boolean(),
                  tsdb: z.boolean(),
                })
                .partial(),
            })
          )
          .optional(),
        fips_compatible: z.boolean().optional(),
        name: z.string(),
        requires_root: z.boolean().optional(),
        title: z.string().optional(),
        version: z.string(),
      })
      .optional(),
    policy_id: z.string().nullish(),
    policy_ids: z.array(z.string()).optional(),
    spaceIds: z.array(z.string()).optional(),
    supports_agentless: z.boolean().nullish().default(false),
    supports_cloud_connector: z.boolean().nullish().default(false),
    vars: z
      .record(
        z.object({
          frozen: z.boolean().optional(),
          type: z.string().optional(),
          value: z.unknown(),
        })
      )
      .optional(),
  }),
  z.object({
    additional_datastreams_permissions: z.array(z.string()).nullish(),
    description: z.string().optional(),
    force: z.boolean().optional(),
    id: z.string().optional(),
    inputs: z
      .record(
        z
          .object({
            enabled: z.boolean(),
            streams: z.record(
              z
                .object({
                  enabled: z.boolean(),
                  vars: z.record(
                    z
                      .union([
                        z.boolean(),
                        z.string(),
                        z.number(),
                        z.array(z.string()),
                        z.array(z.number()),
                        z.object({ id: z.string(), isSecretRef: z.boolean() }),
                      ])
                      .nullable()
                  ),
                })
                .partial()
            ),
            vars: z.record(
              z
                .union([
                  z.boolean(),
                  z.string(),
                  z.number(),
                  z.array(z.string()),
                  z.array(z.number()),
                  z.object({ id: z.string(), isSecretRef: z.boolean() }),
                ])
                .nullable()
            ),
          })
          .partial()
      )
      .optional(),
    name: z.string(),
    namespace: z.string().optional(),
    output_id: z.string().nullish(),
    package: z.object({
      experimental_data_stream_features: z
        .array(
          z.object({
            data_stream: z.string(),
            features: z
              .object({
                doc_value_only_numeric: z.boolean(),
                doc_value_only_other: z.boolean(),
                synthetic_source: z.boolean(),
                tsdb: z.boolean(),
              })
              .partial(),
          })
        )
        .optional(),
      fips_compatible: z.boolean().optional(),
      name: z.string(),
      requires_root: z.boolean().optional(),
      title: z.string().optional(),
      version: z.string(),
    }),
    policy_id: z.string().nullish(),
    policy_ids: z.array(z.string()).optional(),
    supports_agentless: z.boolean().nullish().default(false),
    vars: z
      .record(
        z
          .union([
            z.boolean(),
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
            z.object({ id: z.string(), isSecretRef: z.boolean() }),
          ])
          .nullable()
      )
      .optional(),
  }),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_package_policies_bulk_get_Body = z.object({
  ids: z.array(z.string()),
  ignoreMissing: z.boolean().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_package_policies_packagepolicyid_Body = z.union([
  z
    .object({
      additional_datastreams_permissions: z.array(z.string()).nullable(),
      cloud_connector_id: z.string().nullable(),
      description: z.string(),
      enabled: z.boolean(),
      force: z.boolean(),
      inputs: z.array(
        z.object({
          config: z
            .record(
              z.object({
                frozen: z.boolean().optional(),
                type: z.string().optional(),
                value: z.unknown(),
              })
            )
            .optional(),
          enabled: z.boolean(),
          id: z.string().optional(),
          keep_enabled: z.boolean().optional(),
          policy_template: z.string().optional(),
          streams: z
            .array(
              z.object({
                compiled_stream: z.unknown(),
                config: z
                  .record(
                    z.object({
                      frozen: z.boolean().optional(),
                      type: z.string().optional(),
                      value: z.unknown(),
                    })
                  )
                  .optional(),
                data_stream: z.object({
                  dataset: z.string(),
                  elasticsearch: z
                    .object({
                      dynamic_dataset: z.boolean(),
                      dynamic_namespace: z.boolean(),
                      privileges: z.object({ indices: z.array(z.string()) }).partial(),
                    })
                    .partial()
                    .optional(),
                  type: z.string(),
                }),
                enabled: z.boolean(),
                id: z.string().optional(),
                keep_enabled: z.boolean().optional(),
                release: z.enum(['ga', 'beta', 'experimental']).optional(),
                vars: z
                  .record(
                    z.object({
                      frozen: z.boolean().optional(),
                      type: z.string().optional(),
                      value: z.unknown(),
                    })
                  )
                  .optional(),
              })
            )
            .optional(),
          type: z.string(),
          vars: z
            .record(
              z.object({
                frozen: z.boolean().optional(),
                type: z.string().optional(),
                value: z.unknown(),
              })
            )
            .optional(),
        })
      ),
      is_managed: z.boolean(),
      name: z.string(),
      namespace: z.string(),
      output_id: z.string().nullable(),
      overrides: z
        .object({ inputs: z.object({}).partial().passthrough() })
        .partial()
        .nullable(),
      package: z.object({
        experimental_data_stream_features: z
          .array(
            z.object({
              data_stream: z.string(),
              features: z
                .object({
                  doc_value_only_numeric: z.boolean(),
                  doc_value_only_other: z.boolean(),
                  synthetic_source: z.boolean(),
                  tsdb: z.boolean(),
                })
                .partial(),
            })
          )
          .optional(),
        fips_compatible: z.boolean().optional(),
        name: z.string(),
        requires_root: z.boolean().optional(),
        title: z.string().optional(),
        version: z.string(),
      }),
      policy_id: z.string().nullable(),
      policy_ids: z.array(z.string()),
      spaceIds: z.array(z.string()),
      supports_agentless: z.boolean().nullable().default(false),
      supports_cloud_connector: z.boolean().nullable().default(false),
      vars: z.record(
        z.object({
          frozen: z.boolean().optional(),
          type: z.string().optional(),
          value: z.unknown(),
        })
      ),
      version: z.string(),
    })
    .partial(),
  z.object({
    additional_datastreams_permissions: z.array(z.string()).nullish(),
    description: z.string().optional(),
    force: z.boolean().optional(),
    id: z.string().optional(),
    inputs: z
      .record(
        z
          .object({
            enabled: z.boolean(),
            streams: z.record(
              z
                .object({
                  enabled: z.boolean(),
                  vars: z.record(
                    z
                      .union([
                        z.boolean(),
                        z.string(),
                        z.number(),
                        z.array(z.string()),
                        z.array(z.number()),
                        z.object({ id: z.string(), isSecretRef: z.boolean() }),
                      ])
                      .nullable()
                  ),
                })
                .partial()
            ),
            vars: z.record(
              z
                .union([
                  z.boolean(),
                  z.string(),
                  z.number(),
                  z.array(z.string()),
                  z.array(z.number()),
                  z.object({ id: z.string(), isSecretRef: z.boolean() }),
                ])
                .nullable()
            ),
          })
          .partial()
      )
      .optional(),
    name: z.string(),
    namespace: z.string().optional(),
    output_id: z.string().nullish(),
    package: z.object({
      experimental_data_stream_features: z
        .array(
          z.object({
            data_stream: z.string(),
            features: z
              .object({
                doc_value_only_numeric: z.boolean(),
                doc_value_only_other: z.boolean(),
                synthetic_source: z.boolean(),
                tsdb: z.boolean(),
              })
              .partial(),
          })
        )
        .optional(),
      fips_compatible: z.boolean().optional(),
      name: z.string(),
      requires_root: z.boolean().optional(),
      title: z.string().optional(),
      version: z.string(),
    }),
    policy_id: z.string().nullish(),
    policy_ids: z.array(z.string()).optional(),
    supports_agentless: z.boolean().nullish().default(false),
    vars: z
      .record(
        z
          .union([
            z.boolean(),
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
            z.object({ id: z.string(), isSecretRef: z.boolean() }),
          ])
          .nullable()
      )
      .optional(),
  }),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_package_policies_delete_Body = z.object({
  force: z.boolean().optional(),
  packagePolicyIds: z.array(z.string()),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_package_policies_upgrade_Body = z.object({
  packagePolicyIds: z.array(z.string()),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_package_policies_upgrade_dryrun_Body = z.object({
  packagePolicyIds: z.array(z.string()),
  packageVersion: z.string().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_fleet_proxies_Body = z.object({
  certificate: z.string().nullish(),
  certificate_authorities: z.string().nullish(),
  certificate_key: z.string().nullish(),
  id: z.string().optional(),
  is_preconfigured: z.boolean().optional().default(false),
  name: z.string(),
  proxy_headers: z.record(z.union([z.string(), z.boolean(), z.number()])).nullish(),
  url: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_proxies_itemid_Body = z.object({
  certificate: z.string().nullable(),
  certificate_authorities: z.string().nullable(),
  certificate_key: z.string().nullable(),
  name: z.string().optional(),
  proxy_headers: z.record(z.union([z.string(), z.boolean(), z.number()])).nullable(),
  url: z.string().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_settings_Body = z
  .object({
    additional_yaml_config: z.string(),
    delete_unenrolled_agents: z.object({ enabled: z.boolean(), is_preconfigured: z.boolean() }),
    has_seen_add_data_notice: z.boolean(),
    kibana_ca_sha256: z.string(),
    kibana_urls: z.array(z.string().url()),
    prerelease_integrations_enabled: z.boolean(),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_fleet_space_settings_Body = z
  .object({ allowed_namespace_prefixes: z.array(z.string()) })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListVersionId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListDescription = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListDeserializer = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListMetadata = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListName = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListSerializer = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListType = z.enum([
  'binary',
  'boolean',
  'byte',
  'date',
  'date_nanos',
  'date_range',
  'double',
  'double_range',
  'float',
  'float_range',
  'geo_point',
  'geo_shape',
  'half_float',
  'integer',
  'integer_range',
  'ip',
  'ip_range',
  'keyword',
  'long',
  'long_range',
  'shape',
  'short',
  'text',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListVersion = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_List = z
  .object({
    _version: Security_Lists_API_ListVersionId.optional(),
    '@timestamp': z.string().datetime({ offset: true }).optional(),
    created_at: z.string().datetime({ offset: true }),
    created_by: z.string(),
    description: Security_Lists_API_ListDescription.min(1),
    deserializer: Security_Lists_API_ListDeserializer.optional(),
    id: Security_Lists_API_ListId.min(1),
    immutable: z.boolean(),
    meta: Security_Lists_API_ListMetadata.optional(),
    name: Security_Lists_API_ListName.min(1),
    serializer: Security_Lists_API_ListSerializer.optional(),
    tie_breaker_id: z.string(),
    type: Security_Lists_API_ListType,
    updated_at: z.string().datetime({ offset: true }),
    updated_by: z.string(),
    version: Security_Lists_API_ListVersion.int().gte(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_PlatformErrorResponse = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_SiemErrorResponse = z
  .object({ message: z.string(), status_code: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PatchList_Body = z
  .object({
    _version: Security_Lists_API_ListVersionId.optional(),
    description: Security_Lists_API_ListDescription.min(1).optional(),
    id: Security_Lists_API_ListId.min(1),
    meta: Security_Lists_API_ListMetadata.optional(),
    name: Security_Lists_API_ListName.min(1).optional(),
    version: Security_Lists_API_ListVersion.int().gte(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateList_Body = z
  .object({
    description: Security_Lists_API_ListDescription.min(1),
    deserializer: Security_Lists_API_ListDeserializer.optional(),
    id: Security_Lists_API_ListId.min(1).optional(),
    meta: Security_Lists_API_ListMetadata.optional(),
    name: Security_Lists_API_ListName.min(1),
    serializer: Security_Lists_API_ListSerializer.optional(),
    type: Security_Lists_API_ListType,
    version: z.number().int().gte(1).optional().default(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const UpdateList_Body = z
  .object({
    _version: Security_Lists_API_ListVersionId.optional(),
    description: Security_Lists_API_ListDescription.min(1),
    id: Security_Lists_API_ListId.min(1),
    meta: Security_Lists_API_ListMetadata.optional(),
    name: Security_Lists_API_ListName.min(1),
    version: Security_Lists_API_ListVersion.int().gte(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_FindListsCursor = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListItemId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListItemMetadata = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListItemValue = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListItem = z
  .object({
    _version: Security_Lists_API_ListVersionId.optional(),
    '@timestamp': z.string().datetime({ offset: true }).optional(),
    created_at: z.string().datetime({ offset: true }),
    created_by: z.string(),
    deserializer: Security_Lists_API_ListDeserializer.optional(),
    id: Security_Lists_API_ListItemId.min(1),
    list_id: Security_Lists_API_ListId.min(1),
    meta: Security_Lists_API_ListItemMetadata.optional(),
    serializer: Security_Lists_API_ListSerializer.optional(),
    tie_breaker_id: z.string(),
    type: Security_Lists_API_ListType,
    updated_at: z.string().datetime({ offset: true }),
    updated_by: z.string(),
    value: Security_Lists_API_ListItemValue.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PatchListItem_Body = z
  .object({
    _version: Security_Lists_API_ListVersionId.optional(),
    id: Security_Lists_API_ListItemId.min(1),
    meta: Security_Lists_API_ListItemMetadata.optional(),
    refresh: z.enum(['true', 'false', 'wait_for']).optional(),
    value: Security_Lists_API_ListItemValue.min(1).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateListItem_Body = z
  .object({
    id: Security_Lists_API_ListItemId.min(1).optional(),
    list_id: Security_Lists_API_ListId.min(1),
    meta: Security_Lists_API_ListItemMetadata.optional(),
    refresh: z.enum(['true', 'false', 'wait_for']).optional(),
    value: Security_Lists_API_ListItemValue.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const UpdateListItem_Body = z
  .object({
    _version: Security_Lists_API_ListVersionId.optional(),
    id: Security_Lists_API_ListItemId.min(1),
    meta: Security_Lists_API_ListItemMetadata.optional(),
    value: Security_Lists_API_ListItemValue.min(1),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_FindListItemsCursor = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListItemPrivileges = z
  .object({
    application: z.record(z.boolean()),
    cluster: z.record(z.boolean()),
    has_all_requested: z.boolean(),
    index: z.record(z.record(z.boolean())),
    username: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_ListPrivileges = z
  .object({
    application: z.record(z.boolean()),
    cluster: z.record(z.boolean()),
    has_all_requested: z.boolean(),
    index: z.record(z.record(z.boolean())),
    username: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_logstash_pipeline_Body = z
  .object({
    description: z.string().optional(),
    pipeline: z.string(),
    settings: z.object({}).partial().passthrough().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_maintenance_window_Body = z.object({
  enabled: z.boolean().optional(),
  schedule: z.object({
    custom: z.object({
      duration: z.string(),
      recurring: z
        .object({
          end: z.string(),
          every: z.string(),
          occurrences: z.number().gte(1),
          onMonth: z.array(z.number().gte(1).lte(12)).min(1),
          onMonthDay: z.array(z.number().gte(1).lte(31)).min(1),
          onWeekDay: z.array(z.string()).min(1),
        })
        .partial()
        .optional(),
      start: z.string(),
      timezone: z.string().optional(),
    }),
  }),
  scope: z.object({ alerting: z.object({ query: z.object({ kql: z.string() }) }) }).optional(),
  title: z.string(),
});

export const status = z
  .union([
    z.enum(['running', 'finished', 'upcoming', 'archived']),
    z.array(z.enum(['running', 'finished', 'upcoming', 'archived'])),
  ])
  .optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const patch_maintenance_window_id_Body = z
  .object({
    enabled: z.boolean(),
    schedule: z.object({
      custom: z.object({
        duration: z.string(),
        recurring: z
          .object({
            end: z.string(),
            every: z.string(),
            occurrences: z.number().gte(1),
            onMonth: z.array(z.number().gte(1).lte(12)).min(1),
            onMonthDay: z.array(z.number().gte(1).lte(31)).min(1),
            onWeekDay: z.array(z.string()).min(1),
          })
          .partial()
          .optional(),
        start: z.string(),
        timezone: z.string().optional(),
      }),
    }),
    scope: z.object({ alerting: z.object({ query: z.object({ kql: z.string() }) }) }),
    title: z.string(),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSyncResponseSuccess = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSyncResponseDatafeeds = z
  .object({ success: Machine_learning_APIs_mlSyncResponseSuccess })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSyncResponseAnomalyDetectors = z
  .object({ success: Machine_learning_APIs_mlSyncResponseSuccess })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSyncResponseDataFrameAnalytics = z
  .object({ success: Machine_learning_APIs_mlSyncResponseSuccess })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSyncResponseTrainedModels = z
  .object({ success: Machine_learning_APIs_mlSyncResponseSuccess })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSyncResponseSavedObjectsCreated = z
  .object({
    'anomaly-detector': z.record(Machine_learning_APIs_mlSyncResponseAnomalyDetectors),
    'data-frame-analytics': z.record(Machine_learning_APIs_mlSyncResponseDataFrameAnalytics),
    'trained-model': z.record(Machine_learning_APIs_mlSyncResponseTrainedModels),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSyncResponseSavedObjectsDeleted = z
  .object({
    'anomaly-detector': z.record(Machine_learning_APIs_mlSyncResponseAnomalyDetectors),
    'data-frame-analytics': z.record(Machine_learning_APIs_mlSyncResponseDataFrameAnalytics),
    'trained-model': z.record(Machine_learning_APIs_mlSyncResponseTrainedModels),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSync200Response = z
  .object({
    datafeedsAdded: z.record(Machine_learning_APIs_mlSyncResponseDatafeeds),
    datafeedsRemoved: z.record(Machine_learning_APIs_mlSyncResponseDatafeeds),
    savedObjectsCreated: Machine_learning_APIs_mlSyncResponseSavedObjectsCreated,
    savedObjectsDeleted: Machine_learning_APIs_mlSyncResponseSavedObjectsDeleted,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Machine_learning_APIs_mlSync4xxResponse = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number().int() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DeleteNote_Body = z.union([
  z.object({ noteId: z.string() }).passthrough(),
  z.object({ noteIds: z.array(z.string()).nullable() }).passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_NoteCreatedAndUpdatedMetadata = z
  .object({
    created: z.number().nullable(),
    createdBy: z.string().nullable(),
    updated: z.number().nullable(),
    updatedBy: z.string().nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_BareNote =
  Security_Timeline_API_NoteCreatedAndUpdatedMetadata.and(
    z
      .object({ eventId: z.string().nullish(), note: z.string().nullish(), timelineId: z.string() })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_Note = Security_Timeline_API_BareNote.and(
  z.object({ noteId: z.string(), version: z.string() }).passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_GetNotesResult = z
  .object({ notes: z.array(Security_Timeline_API_Note), totalCount: z.number() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PersistNoteRoute_Body = z
  .object({
    note: Security_Timeline_API_BareNote,
    noteId: z.string().nullish(),
    version: z.string().nullish(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_ResponseNote = z
  .object({ note: Security_Timeline_API_Note })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Observability_AI_Assistant_API_Function = z
  .object({
    description: z.string(),
    name: z.string(),
    parameters: z.object({}).partial().passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Observability_AI_Assistant_API_Instruction = z.union([
  z.string(),
  z.object({ id: z.string(), text: z.string() }).passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Observability_AI_Assistant_API_FunctionCall = z
  .object({
    arguments: z.string().optional(),
    name: z.string(),
    trigger: z.enum(['assistant', 'user', 'elastic']),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Observability_AI_Assistant_API_MessageRoleEnum = z.enum([
  'system',
  'assistant',
  'function',
  'user',
  'elastic',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Observability_AI_Assistant_API_Message = z
  .object({
    '@timestamp': z.string(),
    message: z
      .object({
        content: z.string().optional(),
        data: z.string().optional(),
        event: z.string().optional(),
        function_call: Observability_AI_Assistant_API_FunctionCall.optional(),
        name: z.string().optional(),
        role: Observability_AI_Assistant_API_MessageRoleEnum,
      })
      .passthrough(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const observability_ai_assistant_chat_complete_Body = z
  .object({
    actions: z.array(Observability_AI_Assistant_API_Function).optional(),
    connectorId: z.string(),
    conversationId: z.string().optional(),
    disableFunctions: z.boolean().optional(),
    instructions: z.array(Observability_AI_Assistant_API_Instruction).optional(),
    messages: z.array(Observability_AI_Assistant_API_Message),
    persist: z.boolean(),
    title: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_FindLiveQueryResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_ECSMappingItem = z
  .object({ field: z.string(), value: z.union([z.string(), z.array(z.string())]) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_ECSMapping = z.record(Security_Osquery_API_ECSMappingItem);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_ECSMappingOrUndefined = Security_Osquery_API_ECSMapping;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PackId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PackIdOrUndefined = Security_Osquery_API_PackId;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_QueryId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_Platform = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PlatformOrUndefined = Security_Osquery_API_Platform;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_Query = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_Removed = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_RemovedOrUndefined = Security_Osquery_API_Removed;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_Snapshot = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_SnapshotOrUndefined = Security_Osquery_API_Snapshot;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_Version = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_VersionOrUndefined = Security_Osquery_API_Version;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_ArrayQueriesItem = z
  .object({
    ecs_mapping: Security_Osquery_API_ECSMappingOrUndefined.nullable(),
    id: Security_Osquery_API_QueryId,
    platform: Security_Osquery_API_PlatformOrUndefined.nullable(),
    query: Security_Osquery_API_Query,
    removed: Security_Osquery_API_RemovedOrUndefined.nullable(),
    snapshot: Security_Osquery_API_SnapshotOrUndefined.nullable(),
    version: Security_Osquery_API_VersionOrUndefined.nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_ArrayQueries = z.array(Security_Osquery_API_ArrayQueriesItem);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_QueryOrUndefined = Security_Osquery_API_Query;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_SavedQueryId = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_SavedQueryIdOrUndefined = Security_Osquery_API_SavedQueryId;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_CreateLiveQueryRequestBody = z
  .object({
    agent_all: z.boolean(),
    agent_ids: z.array(z.string()),
    agent_platforms: z.array(z.string()),
    agent_policy_ids: z.array(z.string()),
    alert_ids: z.array(z.string()),
    case_ids: z.array(z.string()),
    ecs_mapping: Security_Osquery_API_ECSMappingOrUndefined.nullable(),
    event_ids: z.array(z.string()),
    metadata: z.object({}).partial().passthrough().nullable(),
    pack_id: Security_Osquery_API_PackIdOrUndefined.nullable(),
    queries: Security_Osquery_API_ArrayQueries,
    query: Security_Osquery_API_QueryOrUndefined.nullable(),
    saved_query_id: Security_Osquery_API_SavedQueryIdOrUndefined.nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_CreateLiveQueryResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_FindLiveQueryDetailsResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_GetLiveQueryResultsResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_FindPacksResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PackDescription = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PackDescriptionOrUndefined = Security_Osquery_API_PackDescription;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_Enabled = z.boolean();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_EnabledOrUndefined = Security_Osquery_API_Enabled;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PackName = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PolicyIds = z.array(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PolicyIdsOrUndefined = Security_Osquery_API_PolicyIds;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_ObjectQueriesItem = z
  .object({
    ecs_mapping: Security_Osquery_API_ECSMappingOrUndefined.nullable(),
    id: Security_Osquery_API_QueryId,
    platform: Security_Osquery_API_PlatformOrUndefined.nullable(),
    query: Security_Osquery_API_Query,
    removed: Security_Osquery_API_RemovedOrUndefined.nullable(),
    saved_query_id: Security_Osquery_API_SavedQueryIdOrUndefined.nullable(),
    snapshot: Security_Osquery_API_SnapshotOrUndefined.nullable(),
    version: Security_Osquery_API_VersionOrUndefined.nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_ObjectQueries = z.record(Security_Osquery_API_ObjectQueriesItem);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_Shards = z.record(z.number());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_CreatePacksRequestBody = z
  .object({
    description: Security_Osquery_API_PackDescriptionOrUndefined.nullable(),
    enabled: Security_Osquery_API_EnabledOrUndefined.nullable(),
    name: Security_Osquery_API_PackName,
    policy_ids: Security_Osquery_API_PolicyIdsOrUndefined.nullable(),
    queries: Security_Osquery_API_ObjectQueries,
    shards: Security_Osquery_API_Shards,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_CreatePacksResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_FindPackResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_UpdatePacksRequestBody = z
  .object({
    description: Security_Osquery_API_PackDescriptionOrUndefined.nullable(),
    enabled: Security_Osquery_API_EnabledOrUndefined.nullable(),
    name: Security_Osquery_API_PackName,
    policy_ids: Security_Osquery_API_PolicyIdsOrUndefined.nullable(),
    queries: Security_Osquery_API_ObjectQueries,
    shards: Security_Osquery_API_Shards,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_UpdatePacksResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_FindSavedQueryResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_SavedQueryDescription = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_SavedQueryDescriptionOrUndefined =
  Security_Osquery_API_SavedQueryDescription;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_Interval = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_CreateSavedQueryRequestBody = z
  .object({
    description: Security_Osquery_API_SavedQueryDescriptionOrUndefined.nullable(),
    ecs_mapping: Security_Osquery_API_ECSMappingOrUndefined.nullable(),
    id: Security_Osquery_API_SavedQueryId,
    interval: Security_Osquery_API_Interval,
    platform: Security_Osquery_API_PlatformOrUndefined.nullable(),
    query: Security_Osquery_API_QueryOrUndefined.nullable(),
    removed: Security_Osquery_API_RemovedOrUndefined.nullable(),
    snapshot: Security_Osquery_API_SnapshotOrUndefined.nullable(),
    version: Security_Osquery_API_VersionOrUndefined.nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_CreateSavedQueryResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_DefaultSuccessResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_FindSavedQueryDetailResponse = z
  .object({})
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_IntervalOrUndefined = Security_Osquery_API_Interval;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_UpdateSavedQueryRequestBody = z
  .object({
    description: Security_Osquery_API_SavedQueryDescriptionOrUndefined.nullable(),
    ecs_mapping: Security_Osquery_API_ECSMappingOrUndefined.nullable(),
    id: Security_Osquery_API_SavedQueryId,
    interval: Security_Osquery_API_IntervalOrUndefined.nullable(),
    platform: Security_Osquery_API_PlatformOrUndefined.nullable(),
    query: Security_Osquery_API_QueryOrUndefined.nullable(),
    removed: Security_Osquery_API_RemovedOrUndefined.nullable(),
    snapshot: Security_Osquery_API_SnapshotOrUndefined.nullable(),
    version: Security_Osquery_API_VersionOrUndefined.nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_UpdateSavedQueryResponse = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PersistPinnedEventRoute_Body = z
  .object({ eventId: z.string(), pinnedEventId: z.string().nullish(), timelineId: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_PinnedEventCreatedAndUpdatedMetadata = z
  .object({
    created: z.number().nullable(),
    createdBy: z.string().nullable(),
    updated: z.number().nullable(),
    updatedBy: z.string().nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_BarePinnedEvent =
  Security_Timeline_API_PinnedEventCreatedAndUpdatedMetadata.and(
    z.object({ eventId: z.string(), timelineId: z.string() }).passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_PinnedEvent = Security_Timeline_API_BarePinnedEvent.and(
  z.object({ pinnedEventId: z.string(), version: z.string() }).passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_PersistPinnedEventResponse = z.union([
  Security_Timeline_API_PinnedEvent,
  z.object({ unpinned: z.boolean() }).passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_TaskManagerUnavailableResponse = z
  .object({ message: z.string(), status_code: z.number().int().gte(400) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_CleanUpRiskEngineErrorResponse = z
  .object({
    cleanup_successful: z.boolean(),
    errors: z.array(z.object({ error: z.string(), seq: z.number().int() }).passthrough()),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ConfigureRiskEngineSavedObject_Body = z
  .object({
    exclude_alert_statuses: z.array(z.string()),
    exclude_alert_tags: z.array(z.string()),
    range: z.object({ end: z.string(), start: z.string() }).partial().passthrough(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_ConfigureRiskEngineSavedObjectErrorResponse = z
  .object({
    errors: z.array(z.object({ error: z.string(), seq: z.number().int() }).passthrough()),
    risk_engine_saved_object_configured: z.boolean(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_RiskEngineScheduleNowResponse = z
  .object({ success: z.boolean() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_RiskEngineScheduleNowErrorResponse = z
  .object({ full_error: z.string(), message: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_saved_objects_export_Body = z
  .object({
    excludeExportDetails: z.boolean().default(false),
    hasReference: z.union([
      z.object({ id: z.string(), type: z.string() }),
      z.array(z.object({ id: z.string(), type: z.string() })),
    ]),
    includeReferencesDeep: z.boolean().default(false),
    objects: z.array(z.object({ id: z.string(), type: z.string() })).max(10000),
    search: z.string(),
    type: z.union([z.string(), z.array(z.string())]),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const resolveImportErrors_Body = z
  .object({
    file: z.any().optional(),
    retries: z.array(
      z
        .object({
          destinationId: z.string().optional(),
          id: z.string(),
          ignoreMissingReferences: z.boolean().optional(),
          overwrite: z.boolean().optional(),
          replaceReferences: z
            .array(
              z
                .object({ from: z.string(), to: z.string(), type: z.string() })
                .partial()
                .passthrough()
            )
            .optional(),
          type: z.string(),
        })
        .passthrough()
    ),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_AnonymizationFieldCreateProps = z
  .object({
    allowed: z.boolean().optional(),
    anonymized: z.boolean().optional(),
    field: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_AnonymizationFieldUpdateProps = z
  .object({ allowed: z.boolean().optional(), anonymized: z.boolean().optional(), id: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PerformAnonymizationFieldsBulkAction_Body = z
  .object({
    create: z.array(Security_AI_Assistant_API_AnonymizationFieldCreateProps),
    delete: z
      .object({ ids: z.array(z.string()).min(1), query: z.string() })
      .partial()
      .passthrough(),
    update: z.array(Security_AI_Assistant_API_AnonymizationFieldUpdateProps),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_AnonymizationFieldDetailsInError = z
  .object({ id: z.string(), name: z.string().optional() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_NormalizedAnonymizationFieldError = z
  .object({
    anonymization_fields: z.array(Security_AI_Assistant_API_AnonymizationFieldDetailsInError),
    err_code: z.string().optional(),
    message: z.string(),
    status_code: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_NonEmptyString = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_NonEmptyTimestamp = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_AnonymizationFieldResponse = z
  .object({
    allowed: z.boolean().optional(),
    anonymized: z.boolean().optional(),
    createdAt: z.string().optional(),
    createdBy: z.string().optional(),
    field: z.string(),
    id: Security_AI_Assistant_API_NonEmptyString.min(1),
    namespace: z.string().optional(),
    timestamp: Security_AI_Assistant_API_NonEmptyTimestamp.min(1).optional(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_AnonymizationFieldsBulkActionSkipReason = z.literal(
  'ANONYMIZATION_FIELD_NOT_MODIFIED'
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_AnonymizationFieldsBulkActionSkipResult = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    skip_reason: Security_AI_Assistant_API_AnonymizationFieldsBulkActionSkipReason,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_AnonymizationFieldsBulkCrudActionResults = z
  .object({
    created: z.array(Security_AI_Assistant_API_AnonymizationFieldResponse),
    deleted: z.array(z.string()),
    skipped: z.array(Security_AI_Assistant_API_AnonymizationFieldsBulkActionSkipResult),
    updated: z.array(Security_AI_Assistant_API_AnonymizationFieldResponse),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_BulkCrudActionSummary = z
  .object({
    failed: z.number().int(),
    skipped: z.number().int(),
    succeeded: z.number().int(),
    total: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_AnonymizationFieldsBulkCrudActionResponse = z
  .object({
    anonymization_fields_count: z.number().int().optional(),
    attributes: z
      .object({
        errors: z.array(Security_AI_Assistant_API_NormalizedAnonymizationFieldError).optional(),
        results: Security_AI_Assistant_API_AnonymizationFieldsBulkCrudActionResults,
        summary: Security_AI_Assistant_API_BulkCrudActionSummary,
      })
      .passthrough(),
    message: z.string().optional(),
    status_code: z.number().int().optional(),
    success: z.boolean().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_MessageData = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ChatMessageRole = z.enum(['system', 'user', 'assistant']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ChatMessage = z
  .object({
    content: z.string().optional(),
    data: Security_AI_Assistant_API_MessageData.optional(),
    fields_to_anonymize: z.array(z.string()).optional(),
    role: Security_AI_Assistant_API_ChatMessageRole,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ChatCompleteProps = z
  .object({
    connectorId: z.string(),
    conversationId: Security_AI_Assistant_API_NonEmptyString.min(1).optional(),
    isStream: z.boolean().optional(),
    langSmithApiKey: z.string().optional(),
    langSmithProject: z.string().optional(),
    messages: z.array(Security_AI_Assistant_API_ChatMessage),
    model: z.string().optional(),
    persist: z.boolean(),
    promptId: z.string().optional(),
    responseLanguage: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DeleteAllConversations_Body = z
  .object({ excludedIds: z.array(z.string()) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_Provider = z.enum(['OpenAI', 'Azure OpenAI', 'Other']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ApiConfig = z
  .object({
    actionTypeId: z.string(),
    connectorId: z.string(),
    defaultSystemPromptId: z.string().optional(),
    model: z.string().optional(),
    provider: Security_AI_Assistant_API_Provider.optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ConversationCategory = z.enum(['assistant', 'insights']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_BaseContentReference = z
  .object({ id: z.string(), type: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryContentReference =
  Security_AI_Assistant_API_BaseContentReference.and(
    z
      .object({
        knowledgeBaseEntryId: z.string(),
        knowledgeBaseEntryName: z.string(),
        type: z.literal('KnowledgeBaseEntry'),
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_SecurityAlertContentReference =
  Security_AI_Assistant_API_BaseContentReference.and(
    z.object({ alertId: z.string(), type: z.literal('SecurityAlert') }).passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_SecurityAlertsPageContentReference =
  Security_AI_Assistant_API_BaseContentReference.and(
    z.object({ type: z.literal('SecurityAlertsPage') }).passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ProductDocumentationContentReference =
  Security_AI_Assistant_API_BaseContentReference.and(
    z
      .object({ title: z.string(), type: z.literal('ProductDocumentation'), url: z.string() })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_EsqlContentReference =
  Security_AI_Assistant_API_BaseContentReference.and(
    z
      .object({
        label: z.string(),
        query: z.string(),
        timerange: z.object({ from: z.string(), to: z.string() }).passthrough().optional(),
        type: z.literal('EsqlQuery'),
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_HrefContentReference =
  Security_AI_Assistant_API_BaseContentReference.and(
    z
      .object({ href: z.string(), label: z.string().optional(), type: z.literal('Href') })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ContentReferences = z.record(
  z.union([
    Security_AI_Assistant_API_KnowledgeBaseEntryContentReference,
    Security_AI_Assistant_API_SecurityAlertContentReference,
    Security_AI_Assistant_API_SecurityAlertsPageContentReference,
    Security_AI_Assistant_API_ProductDocumentationContentReference,
    Security_AI_Assistant_API_EsqlContentReference,
    Security_AI_Assistant_API_HrefContentReference,
  ])
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_MessageMetadata = z
  .object({ contentReferences: Security_AI_Assistant_API_ContentReferences })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_Reader = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_MessageRole = z.enum(['system', 'user', 'assistant']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_TraceData = z
  .object({ traceId: z.string(), transactionId: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_User = z
  .object({ id: z.string(), name: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_Message = z
  .object({
    content: z.string(),
    id: Security_AI_Assistant_API_NonEmptyString.min(1).optional(),
    isError: z.boolean().optional(),
    metadata: Security_AI_Assistant_API_MessageMetadata.optional(),
    reader: Security_AI_Assistant_API_Reader.optional(),
    role: Security_AI_Assistant_API_MessageRole,
    timestamp: Security_AI_Assistant_API_NonEmptyTimestamp.min(1),
    traceData: Security_AI_Assistant_API_TraceData.optional(),
    user: Security_AI_Assistant_API_User.optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_Replacements = z.record(z.string());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ConversationCreateProps = z
  .object({
    apiConfig: Security_AI_Assistant_API_ApiConfig.optional(),
    category: Security_AI_Assistant_API_ConversationCategory.optional(),
    excludeFromLastConversationStorage: z.boolean().optional(),
    id: z.string().optional(),
    messages: z.array(Security_AI_Assistant_API_Message).optional(),
    replacements: Security_AI_Assistant_API_Replacements.optional(),
    title: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ConversationResponse = z
  .object({
    apiConfig: Security_AI_Assistant_API_ApiConfig.optional(),
    category: Security_AI_Assistant_API_ConversationCategory,
    createdAt: z.string(),
    createdBy: Security_AI_Assistant_API_User,
    excludeFromLastConversationStorage: z.boolean().optional(),
    id: Security_AI_Assistant_API_NonEmptyString.min(1),
    messages: z.array(Security_AI_Assistant_API_Message).optional(),
    namespace: z.string(),
    replacements: Security_AI_Assistant_API_Replacements.optional(),
    timestamp: Security_AI_Assistant_API_NonEmptyTimestamp.min(1).optional(),
    title: z.string(),
    updatedAt: z.string().optional(),
    users: z.array(Security_AI_Assistant_API_User),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ConversationUpdateProps = z
  .object({
    apiConfig: Security_AI_Assistant_API_ApiConfig.optional(),
    category: Security_AI_Assistant_API_ConversationCategory.optional(),
    excludeFromLastConversationStorage: z.boolean().optional(),
    id: Security_AI_Assistant_API_NonEmptyString.min(1),
    messages: z.array(Security_AI_Assistant_API_Message).optional(),
    replacements: Security_AI_Assistant_API_Replacements.optional(),
    title: z.string().optional(),
    users: z.array(Security_AI_Assistant_API_User).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseResponse = z
  .object({ success: z.boolean() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseResource = z.enum([
  'security_labs',
  'defend_insights',
  'user',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_DocumentEntryRequiredFields = z
  .object({
    kbResource: Security_AI_Assistant_API_KnowledgeBaseResource,
    source: z.string(),
    text: z.string(),
    type: z.literal('document'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_Vector = z
  .object({ modelId: z.string(), tokens: z.record(z.number()) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_DocumentEntryOptionalFields = z
  .object({ required: z.boolean(), vector: Security_AI_Assistant_API_Vector })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_DocumentEntryCreateFields = z
  .object({
    global: z.boolean().optional(),
    name: z.string(),
    namespace: z.string().optional(),
    users: z.array(Security_AI_Assistant_API_User).optional(),
  })
  .passthrough()
  .and(Security_AI_Assistant_API_DocumentEntryRequiredFields)
  .and(Security_AI_Assistant_API_DocumentEntryOptionalFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_IndexEntryRequiredFields = z
  .object({
    description: z.string(),
    field: z.string(),
    index: z.string(),
    queryDescription: z.string(),
    type: z.literal('index'),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_InputSchema = z.array(
  z.object({ description: z.string(), fieldName: z.string(), fieldType: z.string() }).passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_IndexEntryOptionalFields = z
  .object({ inputSchema: Security_AI_Assistant_API_InputSchema, outputFields: z.array(z.string()) })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_IndexEntryCreateFields = z
  .object({
    global: z.boolean().optional(),
    name: z.string(),
    namespace: z.string().optional(),
    users: z.array(Security_AI_Assistant_API_User).optional(),
  })
  .passthrough()
  .and(Security_AI_Assistant_API_IndexEntryRequiredFields)
  .and(Security_AI_Assistant_API_IndexEntryOptionalFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryCreateProps = z.union([
  Security_AI_Assistant_API_DocumentEntryCreateFields,
  Security_AI_Assistant_API_IndexEntryCreateFields,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_ResponseFields = z
  .object({
    createdAt: z.string(),
    createdBy: z.string(),
    id: Security_AI_Assistant_API_NonEmptyString.min(1),
    updatedAt: z.string(),
    updatedBy: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_DocumentEntryResponseFields =
  Security_AI_Assistant_API_DocumentEntryRequiredFields.and(
    Security_AI_Assistant_API_DocumentEntryOptionalFields
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_DocumentEntry = z
  .object({
    global: z.boolean(),
    name: z.string(),
    namespace: z.string(),
    users: z.array(Security_AI_Assistant_API_User),
  })
  .passthrough()
  .and(Security_AI_Assistant_API_ResponseFields)
  .and(Security_AI_Assistant_API_DocumentEntryResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_IndexEntryResponseFields =
  Security_AI_Assistant_API_IndexEntryRequiredFields.and(
    Security_AI_Assistant_API_IndexEntryOptionalFields
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_IndexEntry = z
  .object({
    global: z.boolean(),
    name: z.string(),
    namespace: z.string(),
    users: z.array(Security_AI_Assistant_API_User),
  })
  .passthrough()
  .and(Security_AI_Assistant_API_ResponseFields)
  .and(Security_AI_Assistant_API_IndexEntryResponseFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryResponse = z.union([
  Security_AI_Assistant_API_DocumentEntry,
  Security_AI_Assistant_API_IndexEntry,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_DocumentEntryUpdateFields = z
  .object({
    global: z.boolean().optional(),
    id: Security_AI_Assistant_API_NonEmptyString.min(1),
    name: z.string().optional(),
    namespace: z.string().optional(),
    users: z.array(Security_AI_Assistant_API_User).optional(),
  })
  .passthrough()
  .and(Security_AI_Assistant_API_DocumentEntryCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_IndexEntryUpdateFields = z
  .object({
    global: z.boolean().optional(),
    id: Security_AI_Assistant_API_NonEmptyString.min(1),
    name: z.string().optional(),
    namespace: z.string().optional(),
    users: z.array(Security_AI_Assistant_API_User).optional(),
  })
  .passthrough()
  .and(Security_AI_Assistant_API_IndexEntryCreateFields);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryUpdateProps = z.union([
  Security_AI_Assistant_API_DocumentEntryUpdateFields,
  Security_AI_Assistant_API_IndexEntryUpdateFields,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PerformKnowledgeBaseEntryBulkAction_Body = z
  .object({
    create: z.array(Security_AI_Assistant_API_KnowledgeBaseEntryCreateProps),
    delete: z
      .object({ ids: z.array(z.string()).min(1), query: z.string() })
      .partial()
      .passthrough(),
    update: z.array(Security_AI_Assistant_API_KnowledgeBaseEntryUpdateProps),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryDetailsInError = z
  .object({ id: z.string(), name: z.string().optional() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_NormalizedKnowledgeBaseEntryError = z
  .object({
    err_code: z.string().optional(),
    knowledgeBaseEntries: z.array(Security_AI_Assistant_API_KnowledgeBaseEntryDetailsInError),
    message: z.string(),
    statusCode: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryBulkActionSkipReason = z.literal(
  'KNOWLEDGE_BASE_ENTRY_NOT_MODIFIED'
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryBulkActionSkipResult = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    skip_reason: Security_AI_Assistant_API_KnowledgeBaseEntryBulkActionSkipReason,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryBulkCrudActionResults = z
  .object({
    created: z.array(Security_AI_Assistant_API_KnowledgeBaseEntryResponse),
    deleted: z.array(z.string()),
    skipped: z.array(Security_AI_Assistant_API_KnowledgeBaseEntryBulkActionSkipResult),
    updated: z.array(Security_AI_Assistant_API_KnowledgeBaseEntryResponse),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryBulkCrudActionSummary = z
  .object({
    failed: z.number().int(),
    skipped: z.number().int(),
    succeeded: z.number().int(),
    total: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryBulkCrudActionResponse = z
  .object({
    attributes: z
      .object({
        errors: z.array(Security_AI_Assistant_API_NormalizedKnowledgeBaseEntryError).optional(),
        results: Security_AI_Assistant_API_KnowledgeBaseEntryBulkCrudActionResults,
        summary: Security_AI_Assistant_API_KnowledgeBaseEntryBulkCrudActionSummary,
      })
      .passthrough(),
    knowledgeBaseEntriesCount: z.number().int().optional(),
    message: z.string().optional(),
    statusCode: z.number().int().optional(),
    success: z.boolean().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_DeleteResponseFields = z
  .object({ id: Security_AI_Assistant_API_NonEmptyString.min(1) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_KnowledgeBaseEntryUpdateRouteProps = z.union([
  Security_AI_Assistant_API_DocumentEntryCreateFields,
  Security_AI_Assistant_API_IndexEntryCreateFields,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptType = z.enum(['system', 'quick']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptCreateProps = z
  .object({
    categories: z.array(z.string()).optional(),
    color: z.string().optional(),
    consumer: z.string().optional(),
    content: z.string(),
    isDefault: z.boolean().optional(),
    isNewConversationDefault: z.boolean().optional(),
    name: z.string(),
    promptType: Security_AI_Assistant_API_PromptType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptUpdateProps = z
  .object({
    categories: z.array(z.string()).optional(),
    color: z.string().optional(),
    consumer: z.string().optional(),
    content: z.string().optional(),
    id: z.string(),
    isDefault: z.boolean().optional(),
    isNewConversationDefault: z.boolean().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PerformPromptsBulkAction_Body = z
  .object({
    create: z.array(Security_AI_Assistant_API_PromptCreateProps),
    delete: z
      .object({ ids: z.array(z.string()).min(1), query: z.string() })
      .partial()
      .passthrough(),
    update: z.array(Security_AI_Assistant_API_PromptUpdateProps),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptDetailsInError = z
  .object({ id: z.string(), name: z.string().optional() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_NormalizedPromptError = z
  .object({
    err_code: z.string().optional(),
    message: z.string(),
    prompts: z.array(Security_AI_Assistant_API_PromptDetailsInError),
    status_code: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptResponse = z
  .object({
    categories: z.array(z.string()).optional(),
    color: z.string().optional(),
    consumer: z.string().optional(),
    content: z.string(),
    createdAt: z.string().optional(),
    createdBy: z.string().optional(),
    id: Security_AI_Assistant_API_NonEmptyString.min(1),
    isDefault: z.boolean().optional(),
    isNewConversationDefault: z.boolean().optional(),
    name: z.string(),
    namespace: z.string().optional(),
    promptType: Security_AI_Assistant_API_PromptType,
    timestamp: Security_AI_Assistant_API_NonEmptyTimestamp.min(1).optional(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
    users: z.array(Security_AI_Assistant_API_User).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptsBulkActionSkipReason = z.literal(
  'PROMPT_FIELD_NOT_MODIFIED'
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptsBulkActionSkipResult = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    skip_reason: Security_AI_Assistant_API_PromptsBulkActionSkipReason,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptsBulkCrudActionResults = z
  .object({
    created: z.array(Security_AI_Assistant_API_PromptResponse),
    deleted: z.array(z.string()),
    skipped: z.array(Security_AI_Assistant_API_PromptsBulkActionSkipResult),
    updated: z.array(Security_AI_Assistant_API_PromptResponse),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_PromptsBulkCrudActionResponse = z
  .object({
    attributes: z
      .object({
        errors: z.array(Security_AI_Assistant_API_NormalizedPromptError).optional(),
        results: Security_AI_Assistant_API_PromptsBulkCrudActionResults,
        summary: Security_AI_Assistant_API_BulkCrudActionSummary,
      })
      .passthrough(),
    message: z.string().optional(),
    prompts_count: z.number().int().optional(),
    status_code: z.number().int().optional(),
    success: z.boolean().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_security_role_query_Body = z
  .object({
    filters: z.object({ showReservedRoles: z.boolean() }).partial(),
    from: z.number(),
    query: z.string(),
    size: z.number(),
    sort: z.object({ direction: z.enum(['asc', 'desc']), field: z.string() }),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_security_role_name_Body = z.object({
  description: z.string().max(2048).optional(),
  elasticsearch: z
    .object({
      cluster: z.array(z.string()),
      indices: z.array(
        z.object({
          allow_restricted_indices: z.boolean().optional(),
          field_security: z.record(z.array(z.string())).optional(),
          names: z.array(z.string()).min(1),
          privileges: z.array(z.string()).min(1),
          query: z.string().optional(),
        })
      ),
      remote_cluster: z.array(
        z.object({ clusters: z.array(z.string()).min(1), privileges: z.array(z.string()).min(1) })
      ),
      remote_indices: z.array(
        z.object({
          allow_restricted_indices: z.boolean().optional(),
          clusters: z.array(z.string()).min(1),
          field_security: z.record(z.array(z.string())).optional(),
          names: z.array(z.string()).min(1),
          privileges: z.array(z.string()).min(1),
          query: z.string().optional(),
        })
      ),
      run_as: z.array(z.string()),
    })
    .partial(),
  kibana: z
    .array(
      z.object({
        base: z.union([z.array(z.string()), z.array(z.string())]).nullable(),
        feature: z.record(z.array(z.string())).optional(),
        spaces: z
          .union([z.array(z.literal('*')), z.array(z.string())])
          .optional()
          .default(['*']),
      })
    )
    .optional(),
  metadata: z.object({}).partial().passthrough().optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_security_roles_Body = z.object({
  roles: z.record(
    z.object({
      description: z.string().max(2048).optional(),
      elasticsearch: z
        .object({
          cluster: z.array(z.string()),
          indices: z.array(
            z.object({
              allow_restricted_indices: z.boolean().optional(),
              field_security: z.record(z.array(z.string())).optional(),
              names: z.array(z.string()).min(1),
              privileges: z.array(z.string()).min(1),
              query: z.string().optional(),
            })
          ),
          remote_cluster: z.array(
            z.object({
              clusters: z.array(z.string()).min(1),
              privileges: z.array(z.string()).min(1),
            })
          ),
          remote_indices: z.array(
            z.object({
              allow_restricted_indices: z.boolean().optional(),
              clusters: z.array(z.string()).min(1),
              field_security: z.record(z.array(z.string())).optional(),
              names: z.array(z.string()).min(1),
              privileges: z.array(z.string()).min(1),
              query: z.string().optional(),
            })
          ),
          run_as: z.array(z.string()),
        })
        .partial(),
      kibana: z
        .array(
          z.object({
            base: z.union([z.array(z.string()), z.array(z.string())]).nullable(),
            feature: z.record(z.array(z.string())).optional(),
            spaces: z
              .union([z.array(z.literal('*')), z.array(z.string())])
              .optional()
              .default(['*']),
          })
        )
        .optional(),
      metadata: z.object({}).partial().passthrough().optional(),
    })
  ),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_security_session_invalidate_Body = z
  .object({
    match: z.enum(['all', 'query']),
    query: z
      .object({
        provider: z.object({ name: z.string().optional(), type: z.string() }).passthrough(),
        username: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_url_Body = z
  .object({
    humanReadableSlug: z.boolean().optional(),
    locatorId: z.string(),
    params: z.object({}).partial().passthrough(),
    slug: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Short_URL_APIs_urlResponse = z
  .object({
    accessCount: z.number().int(),
    accessDate: z.string(),
    createDate: z.string(),
    id: z.string(),
    locator: z
      .object({ id: z.string(), state: z.object({}).partial().passthrough(), version: z.string() })
      .partial()
      .passthrough(),
    slug: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_spaces_copy_saved_objects_Body = z.object({
  compatibilityMode: z.boolean().optional().default(false),
  createNewCopies: z.boolean().optional().default(true),
  includeReferences: z.boolean().optional().default(false),
  objects: z.array(z.object({ id: z.string(), type: z.string() })),
  overwrite: z.boolean().optional().default(false),
  spaces: z.array(z.string()),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_spaces_disable_legacy_url_aliases_Body = z.object({
  aliases: z.array(
    z.object({ sourceId: z.string(), targetSpace: z.string(), targetType: z.string() })
  ),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_spaces_get_shareable_references_Body = z.object({
  objects: z.array(z.object({ id: z.string(), type: z.string() })),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_spaces_resolve_copy_saved_objects_errors_Body = z.object({
  compatibilityMode: z.boolean().optional().default(false),
  createNewCopies: z.boolean().optional().default(true),
  includeReferences: z.boolean().optional().default(false),
  objects: z.array(z.object({ id: z.string(), type: z.string() })),
  retries: z.record(
    z.array(
      z.object({
        createNewCopy: z.boolean().optional(),
        destinationId: z.string().optional(),
        id: z.string(),
        ignoreMissingReferences: z.boolean().optional(),
        overwrite: z.boolean().optional().default(false),
        type: z.string(),
      })
    )
  ),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_spaces_update_objects_spaces_Body = z.object({
  objects: z.array(z.object({ id: z.string(), type: z.string() })),
  spacesToAdd: z.array(z.string()),
  spacesToRemove: z.array(z.string()),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const include_authorized_purposes = z.union([z.literal(false), z.boolean()]).nullable();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_spaces_space_Body = z.object({
  _reserved: z.boolean().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  disabledFeatures: z.array(z.string()).optional().default([]),
  id: z.string(),
  imageUrl: z.string().optional(),
  initials: z.string().max(2).optional(),
  name: z.string().min(1),
  solution: z.enum(['security', 'oblt', 'es', 'classic']).optional(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Kibana_HTTP_APIs_core_status_response = z.object({
  metrics: z.object({
    collection_interval_in_millis: z.number(),
    elasticsearch_client: z.object({
      totalActiveSockets: z.number(),
      totalIdleSockets: z.number(),
      totalQueuedRequests: z.number(),
    }),
    last_updated: z.string(),
  }),
  name: z.string(),
  status: z.object({
    core: z.object({
      elasticsearch: z.object({
        detail: z.string().optional(),
        documentationUrl: z.string().optional(),
        level: z.enum(['available', 'degraded', 'unavailable', 'critical']),
        meta: z.object({}).partial().passthrough(),
        summary: z.string(),
      }),
      http: z
        .object({
          detail: z.string().optional(),
          documentationUrl: z.string().optional(),
          level: z.enum(['available', 'degraded', 'unavailable', 'critical']),
          meta: z.object({}).partial().passthrough(),
          summary: z.string(),
        })
        .optional(),
      savedObjects: z.object({
        detail: z.string().optional(),
        documentationUrl: z.string().optional(),
        level: z.enum(['available', 'degraded', 'unavailable', 'critical']),
        meta: z.object({}).partial().passthrough(),
        summary: z.string(),
      }),
    }),
    overall: z.object({
      detail: z.string().optional(),
      documentationUrl: z.string().optional(),
      level: z.enum(['available', 'degraded', 'unavailable', 'critical']),
      meta: z.object({}).partial().passthrough(),
      summary: z.string(),
    }),
    plugins: z.record(
      z.object({
        detail: z.string().optional(),
        documentationUrl: z.string().optional(),
        level: z.enum(['available', 'degraded', 'unavailable', 'critical']),
        meta: z.object({}).partial().passthrough(),
        summary: z.string(),
      })
    ),
  }),
  uuid: z.string(),
  version: z.object({
    build_date: z.string(),
    build_flavor: z.enum(['serverless', 'traditional']),
    build_hash: z.string(),
    build_number: z.number(),
    build_snapshot: z.boolean(),
    number: z.string(),
  }),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Kibana_HTTP_APIs_core_status_redactedResponse = z.object({
  status: z.object({
    overall: z.object({ level: z.enum(['available', 'degraded', 'unavailable', 'critical']) }),
  }),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const get_streams_Body = z.union([z.object({}).partial(), z.unknown(), z.unknown()]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_streams_name_Body: z.ZodType<any> = z.union([
  z.union([
    z
      .object({})
      .partial()
      .passthrough()
      .and(
        z
          .object({
            stream: z
              .object({ name: z.unknown() })
              .partial()
              .passthrough()
              .and(z.object({ description: z.string(), name: z.string() })),
          })
          .passthrough()
      )
      .and(
        z
          .object({
            dashboards: z.array(z.string()),
            queries: z.array(
              z
                .object({ id: z.string().min(1), title: z.string().min(1) })
                .passthrough()
                .and(
                  z
                    .object({
                      kql: z.object({ query: z.string() }),
                      system: z
                        .object({
                          filter: z.union([
                            z.union([
                              z.object({
                                contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                field: z.string().min(1),
                                gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                range: z
                                  .object({
                                    gt: z.union([z.string(), z.number(), z.boolean()]),
                                    gte: z.union([z.string(), z.number(), z.boolean()]),
                                    lt: z.union([z.string(), z.number(), z.boolean()]),
                                    lte: z.union([z.string(), z.number(), z.boolean()]),
                                  })
                                  .partial()
                                  .optional(),
                                startsWith: z
                                  .union([z.string(), z.number(), z.boolean()])
                                  .optional(),
                              }),
                              z.object({
                                exists: z.boolean().optional(),
                                field: z.string().min(1),
                              }),
                            ]),
                            z.object({ and: z.array(z.unknown()) }),
                            z.object({ or: z.array(z.unknown()) }),
                            z.object({ not: z.unknown() }),
                            z.object({ never: z.object({}).partial() }),
                            z.object({ always: z.object({}).partial() }),
                          ]),
                          name: z.string().min(1),
                        })
                        .optional(),
                    })
                    .passthrough()
                )
            ),
            rules: z.array(z.string()),
          })
          .passthrough()
      )
      .and(
        z
          .object({
            stream: z
              .object({ name: z.unknown() })
              .partial()
              .passthrough()
              .and(
                z
                  .object({})
                  .partial()
                  .passthrough()
                  .and(z.object({ description: z.string(), name: z.string() }).passthrough())
                  .and(
                    z
                      .object({
                        ingest: z.object({
                          lifecycle: z.union([
                            z.object({
                              dsl: z.object({ data_retention: z.string().min(1) }).partial(),
                            }),
                            z.object({ ilm: z.object({ policy: z.string().min(1) }) }),
                            z.object({ inherit: z.object({}).partial() }),
                          ]),
                          processing: z.object({
                            steps: z.array(
                              z.union([
                                z.union([
                                  z.object({
                                    action: z.literal('grok'),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    from: z.string().min(1),
                                    ignore_failure: z.boolean().optional(),
                                    ignore_missing: z.boolean().optional(),
                                    patterns: z.array(z.string().min(1)).min(1),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('dissect'),
                                    append_separator: z.string().min(1).optional(),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    from: z.string().min(1),
                                    ignore_failure: z.boolean().optional(),
                                    ignore_missing: z.boolean().optional(),
                                    pattern: z.string().min(1),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('date'),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    formats: z.array(z.string().min(1)),
                                    from: z.string().min(1),
                                    ignore_failure: z.boolean().optional(),
                                    output_format: z.string().min(1).optional(),
                                    to: z.string().min(1).optional(),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('rename'),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    from: z.string().min(1),
                                    ignore_failure: z.boolean().optional(),
                                    ignore_missing: z.boolean().optional(),
                                    override: z.boolean().optional(),
                                    to: z.string().min(1),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('set'),
                                    copy_from: z.string().min(1).optional(),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    ignore_failure: z.boolean().optional(),
                                    override: z.boolean().optional(),
                                    to: z.string().min(1),
                                    value: z.string().min(1).optional(),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('append'),
                                    allow_duplicates: z.boolean().optional(),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    ignore_failure: z.boolean().optional(),
                                    to: z.string().min(1),
                                    value: z.array(z.unknown()).min(1),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('manual_ingest_pipeline'),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    ignore_failure: z.boolean().optional(),
                                    on_failure: z
                                      .array(z.object({}).partial().passthrough())
                                      .optional(),
                                    processors: z.array(
                                      z.object({
                                        append: z.unknown(),
                                        attachment: z.unknown(),
                                        bytes: z.unknown(),
                                        circle: z.unknown(),
                                        community_id: z.unknown(),
                                        convert: z.unknown(),
                                        csv: z.unknown(),
                                        date: z.unknown(),
                                        date_index_name: z.unknown(),
                                        dissect: z.unknown(),
                                        dot_expander: z.unknown(),
                                        drop: z.unknown(),
                                        enrich: z.unknown(),
                                        fail: z.unknown(),
                                        fingerprint: z.unknown(),
                                        foreach: z.unknown(),
                                        geo_grid: z.unknown(),
                                        geoip: z.unknown(),
                                        grok: z.unknown(),
                                        gsub: z.unknown(),
                                        html_strip: z.unknown(),
                                        inference: z.unknown(),
                                        ip_location: z.unknown(),
                                        join: z.unknown(),
                                        json: z.unknown(),
                                        kv: z.unknown(),
                                        lowercase: z.unknown(),
                                        network_direction: z.unknown(),
                                        pipeline: z.unknown(),
                                        redact: z.unknown(),
                                        registered_domain: z.unknown(),
                                        remove: z.unknown(),
                                        rename: z.unknown(),
                                        reroute: z.unknown(),
                                        script: z.unknown(),
                                        set: z.unknown(),
                                        set_security_user: z.unknown(),
                                        sort: z.unknown(),
                                        split: z.unknown(),
                                        terminate: z.unknown(),
                                        trim: z.unknown(),
                                        uppercase: z.unknown(),
                                        uri_parts: z.unknown(),
                                        urldecode: z.unknown(),
                                        user_agent: z.unknown(),
                                      })
                                    ),
                                    tag: z.string().optional(),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                ]),
                                z.object({
                                  customIdentifier: z.string().optional(),
                                  where: z
                                    .union([
                                      z.union([
                                        z.object({
                                          contains: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          endsWith: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          eq: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          field: z.string().min(1),
                                          gt: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          gte: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          lt: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          lte: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          neq: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          range: z
                                            .object({
                                              gt: z.union([z.string(), z.number(), z.boolean()]),
                                              gte: z.union([z.string(), z.number(), z.boolean()]),
                                              lt: z.union([z.string(), z.number(), z.boolean()]),
                                              lte: z.union([z.string(), z.number(), z.boolean()]),
                                            })
                                            .partial()
                                            .optional(),
                                          startsWith: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                        }),
                                        z.object({
                                          exists: z.boolean().optional(),
                                          field: z.string().min(1),
                                        }),
                                      ]),
                                      z.object({ and: z.array(z.unknown()) }),
                                      z.object({ or: z.array(z.unknown()) }),
                                      z.object({ not: z.unknown() }),
                                      z.object({ never: z.object({}).partial() }),
                                      z.object({ always: z.object({}).partial() }),
                                    ])
                                    .and(z.object({ steps: z.array(z.unknown()) }).passthrough()),
                                }),
                              ])
                            ),
                          }),
                          settings: z
                            .object({
                              'index.number_of_replicas': z.object({ value: z.number() }),
                              'index.number_of_shards': z.object({ value: z.number() }),
                              'index.refresh_interval': z.object({
                                value: z.union([z.string(), z.literal(-1)]),
                              }),
                            })
                            .partial(),
                        }),
                      })
                      .passthrough()
                  )
                  .and(
                    z
                      .object({
                        ingest: z.object({
                          wired: z.object({
                            fields: z.record(
                              z
                                .record(
                                  z.union([
                                    z.union([
                                      z.string(),
                                      z.number(),
                                      z.boolean(),
                                      z.unknown(),
                                      z.unknown(),
                                    ]),
                                    z.array(
                                      z.union([
                                        z.string(),
                                        z.number(),
                                        z.boolean(),
                                        z.unknown(),
                                        z.unknown(),
                                      ])
                                    ),
                                    z.unknown(),
                                  ])
                                )
                                .and(
                                  z.union([
                                    z.object({
                                      format: z.string().min(1).optional(),
                                      type: z.enum([
                                        'keyword',
                                        'match_only_text',
                                        'long',
                                        'double',
                                        'date',
                                        'boolean',
                                        'ip',
                                      ]),
                                    }),
                                    z.object({ type: z.literal('system') }),
                                  ])
                                )
                            ),
                            routing: z.array(
                              z.object({
                                destination: z.string().min(1),
                                status: z.enum(['enabled', 'disabled']).optional(),
                                where: z.union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ]),
                              })
                            ),
                          }),
                        }),
                      })
                      .passthrough()
                  )
              ),
          })
          .passthrough()
      )
      .and(z.object({}).partial().passthrough())
      .and(
        z
          .object({
            stream: z
              .object({ name: z.unknown() })
              .partial()
              .passthrough()
              .and(z.object({ description: z.string(), name: z.string() })),
          })
          .passthrough()
      )
      .and(
        z
          .object({
            dashboards: z.array(z.string()),
            queries: z.array(
              z
                .object({ id: z.string().min(1), title: z.string().min(1) })
                .passthrough()
                .and(
                  z
                    .object({
                      kql: z.object({ query: z.string() }),
                      system: z
                        .object({
                          filter: z.union([
                            z.union([
                              z.object({
                                contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                field: z.string().min(1),
                                gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                range: z
                                  .object({
                                    gt: z.union([z.string(), z.number(), z.boolean()]),
                                    gte: z.union([z.string(), z.number(), z.boolean()]),
                                    lt: z.union([z.string(), z.number(), z.boolean()]),
                                    lte: z.union([z.string(), z.number(), z.boolean()]),
                                  })
                                  .partial()
                                  .optional(),
                                startsWith: z
                                  .union([z.string(), z.number(), z.boolean()])
                                  .optional(),
                              }),
                              z.object({
                                exists: z.boolean().optional(),
                                field: z.string().min(1),
                              }),
                            ]),
                            z.object({ and: z.array(z.unknown()) }),
                            z.object({ or: z.array(z.unknown()) }),
                            z.object({ not: z.unknown() }),
                            z.object({ never: z.object({}).partial() }),
                            z.object({ always: z.object({}).partial() }),
                          ]),
                          name: z.string().min(1),
                        })
                        .optional(),
                    })
                    .passthrough()
                )
            ),
            rules: z.array(z.string()),
          })
          .passthrough()
      )
      .and(
        z
          .object({
            stream: z
              .object({ name: z.unknown() })
              .partial()
              .passthrough()
              .and(
                z.object({
                  ingest: z.object({
                    lifecycle: z.union([
                      z.object({ dsl: z.object({ data_retention: z.string().min(1) }).partial() }),
                      z.object({ ilm: z.object({ policy: z.string().min(1) }) }),
                      z.object({ inherit: z.object({}).partial() }),
                    ]),
                    processing: z.object({
                      steps: z.array(
                        z.union([
                          z.union([
                            z.object({
                              action: z.literal('grok'),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              from: z.string().min(1),
                              ignore_failure: z.boolean().optional(),
                              ignore_missing: z.boolean().optional(),
                              patterns: z.array(z.string().min(1)).min(1),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('dissect'),
                              append_separator: z.string().min(1).optional(),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              from: z.string().min(1),
                              ignore_failure: z.boolean().optional(),
                              ignore_missing: z.boolean().optional(),
                              pattern: z.string().min(1),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('date'),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              formats: z.array(z.string().min(1)),
                              from: z.string().min(1),
                              ignore_failure: z.boolean().optional(),
                              output_format: z.string().min(1).optional(),
                              to: z.string().min(1).optional(),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('rename'),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              from: z.string().min(1),
                              ignore_failure: z.boolean().optional(),
                              ignore_missing: z.boolean().optional(),
                              override: z.boolean().optional(),
                              to: z.string().min(1),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('set'),
                              copy_from: z.string().min(1).optional(),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              ignore_failure: z.boolean().optional(),
                              override: z.boolean().optional(),
                              to: z.string().min(1),
                              value: z.string().min(1).optional(),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('append'),
                              allow_duplicates: z.boolean().optional(),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              ignore_failure: z.boolean().optional(),
                              to: z.string().min(1),
                              value: z.array(z.unknown()).min(1),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('manual_ingest_pipeline'),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              ignore_failure: z.boolean().optional(),
                              on_failure: z.array(z.object({}).partial().passthrough()).optional(),
                              processors: z.array(
                                z.object({
                                  append: z.unknown(),
                                  attachment: z.unknown(),
                                  bytes: z.unknown(),
                                  circle: z.unknown(),
                                  community_id: z.unknown(),
                                  convert: z.unknown(),
                                  csv: z.unknown(),
                                  date: z.unknown(),
                                  date_index_name: z.unknown(),
                                  dissect: z.unknown(),
                                  dot_expander: z.unknown(),
                                  drop: z.unknown(),
                                  enrich: z.unknown(),
                                  fail: z.unknown(),
                                  fingerprint: z.unknown(),
                                  foreach: z.unknown(),
                                  geo_grid: z.unknown(),
                                  geoip: z.unknown(),
                                  grok: z.unknown(),
                                  gsub: z.unknown(),
                                  html_strip: z.unknown(),
                                  inference: z.unknown(),
                                  ip_location: z.unknown(),
                                  join: z.unknown(),
                                  json: z.unknown(),
                                  kv: z.unknown(),
                                  lowercase: z.unknown(),
                                  network_direction: z.unknown(),
                                  pipeline: z.unknown(),
                                  redact: z.unknown(),
                                  registered_domain: z.unknown(),
                                  remove: z.unknown(),
                                  rename: z.unknown(),
                                  reroute: z.unknown(),
                                  script: z.unknown(),
                                  set: z.unknown(),
                                  set_security_user: z.unknown(),
                                  sort: z.unknown(),
                                  split: z.unknown(),
                                  terminate: z.unknown(),
                                  trim: z.unknown(),
                                  uppercase: z.unknown(),
                                  uri_parts: z.unknown(),
                                  urldecode: z.unknown(),
                                  user_agent: z.unknown(),
                                })
                              ),
                              tag: z.string().optional(),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                          ]),
                          z.object({
                            customIdentifier: z.string().optional(),
                            where: z
                              .union([
                                z.union([
                                  z.object({
                                    contains: z
                                      .union([z.string(), z.number(), z.boolean()])
                                      .optional(),
                                    endsWith: z
                                      .union([z.string(), z.number(), z.boolean()])
                                      .optional(),
                                    eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    field: z.string().min(1),
                                    gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    range: z
                                      .object({
                                        gt: z.union([z.string(), z.number(), z.boolean()]),
                                        gte: z.union([z.string(), z.number(), z.boolean()]),
                                        lt: z.union([z.string(), z.number(), z.boolean()]),
                                        lte: z.union([z.string(), z.number(), z.boolean()]),
                                      })
                                      .partial()
                                      .optional(),
                                    startsWith: z
                                      .union([z.string(), z.number(), z.boolean()])
                                      .optional(),
                                  }),
                                  z.object({
                                    exists: z.boolean().optional(),
                                    field: z.string().min(1),
                                  }),
                                ]),
                                z.object({ and: z.array(z.unknown()) }),
                                z.object({ or: z.array(z.unknown()) }),
                                z.object({ not: z.unknown() }),
                                z.object({ never: z.object({}).partial() }),
                                z.object({ always: z.object({}).partial() }),
                              ])
                              .and(z.object({ steps: z.array(z.unknown()) }).passthrough()),
                          }),
                        ])
                      ),
                    }),
                    settings: z
                      .object({
                        'index.number_of_replicas': z.object({ value: z.number() }),
                        'index.number_of_shards': z.object({ value: z.number() }),
                        'index.refresh_interval': z.object({
                          value: z.union([z.string(), z.literal(-1)]),
                        }),
                      })
                      .partial(),
                  }),
                })
              ),
          })
          .passthrough()
      )
      .and(z.object({}).partial().passthrough())
      .and(z.object({}).partial().passthrough()),
    z
      .object({})
      .partial()
      .passthrough()
      .and(
        z
          .object({
            stream: z
              .object({ name: z.unknown() })
              .partial()
              .passthrough()
              .and(z.object({ description: z.string(), name: z.string() })),
          })
          .passthrough()
      )
      .and(
        z
          .object({
            dashboards: z.array(z.string()),
            queries: z.array(
              z
                .object({ id: z.string().min(1), title: z.string().min(1) })
                .passthrough()
                .and(
                  z
                    .object({
                      kql: z.object({ query: z.string() }),
                      system: z
                        .object({
                          filter: z.union([
                            z.union([
                              z.object({
                                contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                field: z.string().min(1),
                                gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                range: z
                                  .object({
                                    gt: z.union([z.string(), z.number(), z.boolean()]),
                                    gte: z.union([z.string(), z.number(), z.boolean()]),
                                    lt: z.union([z.string(), z.number(), z.boolean()]),
                                    lte: z.union([z.string(), z.number(), z.boolean()]),
                                  })
                                  .partial()
                                  .optional(),
                                startsWith: z
                                  .union([z.string(), z.number(), z.boolean()])
                                  .optional(),
                              }),
                              z.object({
                                exists: z.boolean().optional(),
                                field: z.string().min(1),
                              }),
                            ]),
                            z.object({ and: z.array(z.unknown()) }),
                            z.object({ or: z.array(z.unknown()) }),
                            z.object({ not: z.unknown() }),
                            z.object({ never: z.object({}).partial() }),
                            z.object({ always: z.object({}).partial() }),
                          ]),
                          name: z.string().min(1),
                        })
                        .optional(),
                    })
                    .passthrough()
                )
            ),
            rules: z.array(z.string()),
          })
          .passthrough()
      )
      .and(
        z
          .object({
            stream: z
              .object({ name: z.unknown() })
              .partial()
              .passthrough()
              .and(
                z
                  .object({})
                  .partial()
                  .passthrough()
                  .and(z.object({ description: z.string(), name: z.string() }).passthrough())
                  .and(
                    z
                      .object({
                        ingest: z.object({
                          lifecycle: z.union([
                            z.object({
                              dsl: z.object({ data_retention: z.string().min(1) }).partial(),
                            }),
                            z.object({ ilm: z.object({ policy: z.string().min(1) }) }),
                            z.object({ inherit: z.object({}).partial() }),
                          ]),
                          processing: z.object({
                            steps: z.array(
                              z.union([
                                z.union([
                                  z.object({
                                    action: z.literal('grok'),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    from: z.string().min(1),
                                    ignore_failure: z.boolean().optional(),
                                    ignore_missing: z.boolean().optional(),
                                    patterns: z.array(z.string().min(1)).min(1),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('dissect'),
                                    append_separator: z.string().min(1).optional(),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    from: z.string().min(1),
                                    ignore_failure: z.boolean().optional(),
                                    ignore_missing: z.boolean().optional(),
                                    pattern: z.string().min(1),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('date'),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    formats: z.array(z.string().min(1)),
                                    from: z.string().min(1),
                                    ignore_failure: z.boolean().optional(),
                                    output_format: z.string().min(1).optional(),
                                    to: z.string().min(1).optional(),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('rename'),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    from: z.string().min(1),
                                    ignore_failure: z.boolean().optional(),
                                    ignore_missing: z.boolean().optional(),
                                    override: z.boolean().optional(),
                                    to: z.string().min(1),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('set'),
                                    copy_from: z.string().min(1).optional(),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    ignore_failure: z.boolean().optional(),
                                    override: z.boolean().optional(),
                                    to: z.string().min(1),
                                    value: z.string().min(1).optional(),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('append'),
                                    allow_duplicates: z.boolean().optional(),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    ignore_failure: z.boolean().optional(),
                                    to: z.string().min(1),
                                    value: z.array(z.unknown()).min(1),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                  z.object({
                                    action: z.literal('manual_ingest_pipeline'),
                                    customIdentifier: z.string().min(1).optional(),
                                    description: z.string().optional(),
                                    ignore_failure: z.boolean().optional(),
                                    on_failure: z
                                      .array(z.object({}).partial().passthrough())
                                      .optional(),
                                    processors: z.array(
                                      z.object({
                                        append: z.unknown(),
                                        attachment: z.unknown(),
                                        bytes: z.unknown(),
                                        circle: z.unknown(),
                                        community_id: z.unknown(),
                                        convert: z.unknown(),
                                        csv: z.unknown(),
                                        date: z.unknown(),
                                        date_index_name: z.unknown(),
                                        dissect: z.unknown(),
                                        dot_expander: z.unknown(),
                                        drop: z.unknown(),
                                        enrich: z.unknown(),
                                        fail: z.unknown(),
                                        fingerprint: z.unknown(),
                                        foreach: z.unknown(),
                                        geo_grid: z.unknown(),
                                        geoip: z.unknown(),
                                        grok: z.unknown(),
                                        gsub: z.unknown(),
                                        html_strip: z.unknown(),
                                        inference: z.unknown(),
                                        ip_location: z.unknown(),
                                        join: z.unknown(),
                                        json: z.unknown(),
                                        kv: z.unknown(),
                                        lowercase: z.unknown(),
                                        network_direction: z.unknown(),
                                        pipeline: z.unknown(),
                                        redact: z.unknown(),
                                        registered_domain: z.unknown(),
                                        remove: z.unknown(),
                                        rename: z.unknown(),
                                        reroute: z.unknown(),
                                        script: z.unknown(),
                                        set: z.unknown(),
                                        set_security_user: z.unknown(),
                                        sort: z.unknown(),
                                        split: z.unknown(),
                                        terminate: z.unknown(),
                                        trim: z.unknown(),
                                        uppercase: z.unknown(),
                                        uri_parts: z.unknown(),
                                        urldecode: z.unknown(),
                                        user_agent: z.unknown(),
                                      })
                                    ),
                                    tag: z.string().optional(),
                                    where: z
                                      .union([
                                        z.union([
                                          z.object({
                                            contains: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            endsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            eq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            field: z.string().min(1),
                                            gt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            gte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lt: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            lte: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            neq: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                            range: z
                                              .object({
                                                gt: z.union([z.string(), z.number(), z.boolean()]),
                                                gte: z.union([z.string(), z.number(), z.boolean()]),
                                                lt: z.union([z.string(), z.number(), z.boolean()]),
                                                lte: z.union([z.string(), z.number(), z.boolean()]),
                                              })
                                              .partial()
                                              .optional(),
                                            startsWith: z
                                              .union([z.string(), z.number(), z.boolean()])
                                              .optional(),
                                          }),
                                          z.object({
                                            exists: z.boolean().optional(),
                                            field: z.string().min(1),
                                          }),
                                        ]),
                                        z.object({ and: z.array(z.unknown()) }),
                                        z.object({ or: z.array(z.unknown()) }),
                                        z.object({ not: z.unknown() }),
                                        z.object({ never: z.object({}).partial() }),
                                        z.object({ always: z.object({}).partial() }),
                                      ])
                                      .optional(),
                                  }),
                                ]),
                                z.object({
                                  customIdentifier: z.string().optional(),
                                  where: z
                                    .union([
                                      z.union([
                                        z.object({
                                          contains: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          endsWith: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          eq: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          field: z.string().min(1),
                                          gt: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          gte: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          lt: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          lte: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          neq: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                          range: z
                                            .object({
                                              gt: z.union([z.string(), z.number(), z.boolean()]),
                                              gte: z.union([z.string(), z.number(), z.boolean()]),
                                              lt: z.union([z.string(), z.number(), z.boolean()]),
                                              lte: z.union([z.string(), z.number(), z.boolean()]),
                                            })
                                            .partial()
                                            .optional(),
                                          startsWith: z
                                            .union([z.string(), z.number(), z.boolean()])
                                            .optional(),
                                        }),
                                        z.object({
                                          exists: z.boolean().optional(),
                                          field: z.string().min(1),
                                        }),
                                      ]),
                                      z.object({ and: z.array(z.unknown()) }),
                                      z.object({ or: z.array(z.unknown()) }),
                                      z.object({ not: z.unknown() }),
                                      z.object({ never: z.object({}).partial() }),
                                      z.object({ always: z.object({}).partial() }),
                                    ])
                                    .and(z.object({ steps: z.array(z.unknown()) }).passthrough()),
                                }),
                              ])
                            ),
                          }),
                          settings: z
                            .object({
                              'index.number_of_replicas': z.object({ value: z.number() }),
                              'index.number_of_shards': z.object({ value: z.number() }),
                              'index.refresh_interval': z.object({
                                value: z.union([z.string(), z.literal(-1)]),
                              }),
                            })
                            .partial(),
                        }),
                      })
                      .passthrough()
                  )
                  .and(
                    z
                      .object({
                        ingest: z.object({
                          classic: z
                            .object({
                              field_overrides: z.record(
                                z
                                  .record(
                                    z.union([
                                      z.union([
                                        z.string(),
                                        z.number(),
                                        z.boolean(),
                                        z.unknown(),
                                        z.unknown(),
                                      ]),
                                      z.array(
                                        z.union([
                                          z.string(),
                                          z.number(),
                                          z.boolean(),
                                          z.unknown(),
                                          z.unknown(),
                                        ])
                                      ),
                                      z.unknown(),
                                    ])
                                  )
                                  .and(
                                    z.union([
                                      z.object({
                                        format: z.string().min(1).optional(),
                                        type: z.enum([
                                          'keyword',
                                          'match_only_text',
                                          'long',
                                          'double',
                                          'date',
                                          'boolean',
                                          'ip',
                                        ]),
                                      }),
                                      z.object({ type: z.literal('system') }),
                                    ])
                                  )
                              ),
                            })
                            .partial(),
                        }),
                      })
                      .passthrough()
                  )
              ),
          })
          .passthrough()
      )
      .and(z.object({}).partial().passthrough())
      .and(
        z
          .object({
            stream: z
              .object({ name: z.unknown() })
              .partial()
              .passthrough()
              .and(z.object({ description: z.string(), name: z.string() })),
          })
          .passthrough()
      )
      .and(
        z
          .object({
            dashboards: z.array(z.string()),
            queries: z.array(
              z
                .object({ id: z.string().min(1), title: z.string().min(1) })
                .passthrough()
                .and(
                  z
                    .object({
                      kql: z.object({ query: z.string() }),
                      system: z
                        .object({
                          filter: z.union([
                            z.union([
                              z.object({
                                contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                field: z.string().min(1),
                                gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                range: z
                                  .object({
                                    gt: z.union([z.string(), z.number(), z.boolean()]),
                                    gte: z.union([z.string(), z.number(), z.boolean()]),
                                    lt: z.union([z.string(), z.number(), z.boolean()]),
                                    lte: z.union([z.string(), z.number(), z.boolean()]),
                                  })
                                  .partial()
                                  .optional(),
                                startsWith: z
                                  .union([z.string(), z.number(), z.boolean()])
                                  .optional(),
                              }),
                              z.object({
                                exists: z.boolean().optional(),
                                field: z.string().min(1),
                              }),
                            ]),
                            z.object({ and: z.array(z.unknown()) }),
                            z.object({ or: z.array(z.unknown()) }),
                            z.object({ not: z.unknown() }),
                            z.object({ never: z.object({}).partial() }),
                            z.object({ always: z.object({}).partial() }),
                          ]),
                          name: z.string().min(1),
                        })
                        .optional(),
                    })
                    .passthrough()
                )
            ),
            rules: z.array(z.string()),
          })
          .passthrough()
      )
      .and(
        z
          .object({
            stream: z
              .object({ name: z.unknown() })
              .partial()
              .passthrough()
              .and(
                z.object({
                  ingest: z.object({
                    lifecycle: z.union([
                      z.object({ dsl: z.object({ data_retention: z.string().min(1) }).partial() }),
                      z.object({ ilm: z.object({ policy: z.string().min(1) }) }),
                      z.object({ inherit: z.object({}).partial() }),
                    ]),
                    processing: z.object({
                      steps: z.array(
                        z.union([
                          z.union([
                            z.object({
                              action: z.literal('grok'),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              from: z.string().min(1),
                              ignore_failure: z.boolean().optional(),
                              ignore_missing: z.boolean().optional(),
                              patterns: z.array(z.string().min(1)).min(1),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('dissect'),
                              append_separator: z.string().min(1).optional(),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              from: z.string().min(1),
                              ignore_failure: z.boolean().optional(),
                              ignore_missing: z.boolean().optional(),
                              pattern: z.string().min(1),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('date'),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              formats: z.array(z.string().min(1)),
                              from: z.string().min(1),
                              ignore_failure: z.boolean().optional(),
                              output_format: z.string().min(1).optional(),
                              to: z.string().min(1).optional(),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('rename'),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              from: z.string().min(1),
                              ignore_failure: z.boolean().optional(),
                              ignore_missing: z.boolean().optional(),
                              override: z.boolean().optional(),
                              to: z.string().min(1),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('set'),
                              copy_from: z.string().min(1).optional(),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              ignore_failure: z.boolean().optional(),
                              override: z.boolean().optional(),
                              to: z.string().min(1),
                              value: z.string().min(1).optional(),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('append'),
                              allow_duplicates: z.boolean().optional(),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              ignore_failure: z.boolean().optional(),
                              to: z.string().min(1),
                              value: z.array(z.unknown()).min(1),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                            z.object({
                              action: z.literal('manual_ingest_pipeline'),
                              customIdentifier: z.string().min(1).optional(),
                              description: z.string().optional(),
                              ignore_failure: z.boolean().optional(),
                              on_failure: z.array(z.object({}).partial().passthrough()).optional(),
                              processors: z.array(
                                z.object({
                                  append: z.unknown(),
                                  attachment: z.unknown(),
                                  bytes: z.unknown(),
                                  circle: z.unknown(),
                                  community_id: z.unknown(),
                                  convert: z.unknown(),
                                  csv: z.unknown(),
                                  date: z.unknown(),
                                  date_index_name: z.unknown(),
                                  dissect: z.unknown(),
                                  dot_expander: z.unknown(),
                                  drop: z.unknown(),
                                  enrich: z.unknown(),
                                  fail: z.unknown(),
                                  fingerprint: z.unknown(),
                                  foreach: z.unknown(),
                                  geo_grid: z.unknown(),
                                  geoip: z.unknown(),
                                  grok: z.unknown(),
                                  gsub: z.unknown(),
                                  html_strip: z.unknown(),
                                  inference: z.unknown(),
                                  ip_location: z.unknown(),
                                  join: z.unknown(),
                                  json: z.unknown(),
                                  kv: z.unknown(),
                                  lowercase: z.unknown(),
                                  network_direction: z.unknown(),
                                  pipeline: z.unknown(),
                                  redact: z.unknown(),
                                  registered_domain: z.unknown(),
                                  remove: z.unknown(),
                                  rename: z.unknown(),
                                  reroute: z.unknown(),
                                  script: z.unknown(),
                                  set: z.unknown(),
                                  set_security_user: z.unknown(),
                                  sort: z.unknown(),
                                  split: z.unknown(),
                                  terminate: z.unknown(),
                                  trim: z.unknown(),
                                  uppercase: z.unknown(),
                                  uri_parts: z.unknown(),
                                  urldecode: z.unknown(),
                                  user_agent: z.unknown(),
                                })
                              ),
                              tag: z.string().optional(),
                              where: z
                                .union([
                                  z.union([
                                    z.object({
                                      contains: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      endsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      field: z.string().min(1),
                                      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      gte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                      lte: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      neq: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                      range: z
                                        .object({
                                          gt: z.union([z.string(), z.number(), z.boolean()]),
                                          gte: z.union([z.string(), z.number(), z.boolean()]),
                                          lt: z.union([z.string(), z.number(), z.boolean()]),
                                          lte: z.union([z.string(), z.number(), z.boolean()]),
                                        })
                                        .partial()
                                        .optional(),
                                      startsWith: z
                                        .union([z.string(), z.number(), z.boolean()])
                                        .optional(),
                                    }),
                                    z.object({
                                      exists: z.boolean().optional(),
                                      field: z.string().min(1),
                                    }),
                                  ]),
                                  z.object({ and: z.array(z.unknown()) }),
                                  z.object({ or: z.array(z.unknown()) }),
                                  z.object({ not: z.unknown() }),
                                  z.object({ never: z.object({}).partial() }),
                                  z.object({ always: z.object({}).partial() }),
                                ])
                                .optional(),
                            }),
                          ]),
                          z.object({
                            customIdentifier: z.string().optional(),
                            where: z
                              .union([
                                z.union([
                                  z.object({
                                    contains: z
                                      .union([z.string(), z.number(), z.boolean()])
                                      .optional(),
                                    endsWith: z
                                      .union([z.string(), z.number(), z.boolean()])
                                      .optional(),
                                    eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    field: z.string().min(1),
                                    gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                                    range: z
                                      .object({
                                        gt: z.union([z.string(), z.number(), z.boolean()]),
                                        gte: z.union([z.string(), z.number(), z.boolean()]),
                                        lt: z.union([z.string(), z.number(), z.boolean()]),
                                        lte: z.union([z.string(), z.number(), z.boolean()]),
                                      })
                                      .partial()
                                      .optional(),
                                    startsWith: z
                                      .union([z.string(), z.number(), z.boolean()])
                                      .optional(),
                                  }),
                                  z.object({
                                    exists: z.boolean().optional(),
                                    field: z.string().min(1),
                                  }),
                                ]),
                                z.object({ and: z.array(z.unknown()) }),
                                z.object({ or: z.array(z.unknown()) }),
                                z.object({ not: z.unknown() }),
                                z.object({ never: z.object({}).partial() }),
                                z.object({ always: z.object({}).partial() }),
                              ])
                              .and(z.object({ steps: z.array(z.unknown()) }).passthrough()),
                          }),
                        ])
                      ),
                    }),
                    settings: z
                      .object({
                        'index.number_of_replicas': z.object({ value: z.number() }),
                        'index.number_of_shards': z.object({ value: z.number() }),
                        'index.refresh_interval': z.object({
                          value: z.union([z.string(), z.literal(-1)]),
                        }),
                      })
                      .partial(),
                  }),
                })
              ),
          })
          .passthrough()
      )
      .and(z.object({}).partial().passthrough())
      .and(z.object({}).partial().passthrough()),
  ]),
  z
    .object({})
    .partial()
    .passthrough()
    .and(
      z
        .object({
          stream: z
            .object({ name: z.unknown() })
            .partial()
            .passthrough()
            .and(z.object({ description: z.string(), name: z.string() })),
        })
        .passthrough()
    )
    .and(
      z
        .object({
          dashboards: z.array(z.string()),
          queries: z.array(
            z
              .object({ id: z.string().min(1), title: z.string().min(1) })
              .passthrough()
              .and(
                z
                  .object({
                    kql: z.object({ query: z.string() }),
                    system: z
                      .object({
                        filter: z.union([
                          z.union([
                            z.object({
                              contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                              endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                              eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                              field: z.string().min(1),
                              gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                              gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                              lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                              lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                              neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                              range: z
                                .object({
                                  gt: z.union([z.string(), z.number(), z.boolean()]),
                                  gte: z.union([z.string(), z.number(), z.boolean()]),
                                  lt: z.union([z.string(), z.number(), z.boolean()]),
                                  lte: z.union([z.string(), z.number(), z.boolean()]),
                                })
                                .partial()
                                .optional(),
                              startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                            }),
                            z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                          ]),
                          z.object({ and: z.array(z.unknown()) }),
                          z.object({ or: z.array(z.unknown()) }),
                          z.object({ not: z.unknown() }),
                          z.object({ never: z.object({}).partial() }),
                          z.object({ always: z.object({}).partial() }),
                        ]),
                        name: z.string().min(1),
                      })
                      .optional(),
                  })
                  .passthrough()
              )
          ),
          rules: z.array(z.string()),
        })
        .passthrough()
    )
    .and(
      z
        .object({
          stream: z
            .object({ name: z.unknown() })
            .partial()
            .passthrough()
            .and(
              z.object({
                group: z.object({
                  members: z.array(z.string()),
                  metadata: z.record(z.string()),
                  tags: z.array(z.string()),
                }),
              })
            ),
        })
        .passthrough()
    )
    .and(z.object({}).partial().passthrough()),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_streams_name_fork_Body = z.object({
  status: z.enum(['enabled', 'disabled']).optional(),
  stream: z.object({ name: z.string() }),
  where: z.union([
    z.union([
      z.object({
        contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
        endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
        eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
        field: z.string().min(1),
        gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
        gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
        lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
        lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
        neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
        range: z
          .object({
            gt: z.union([z.string(), z.number(), z.boolean()]),
            gte: z.union([z.string(), z.number(), z.boolean()]),
            lt: z.union([z.string(), z.number(), z.boolean()]),
            lte: z.union([z.string(), z.number(), z.boolean()]),
          })
          .partial()
          .optional(),
        startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
      }),
      z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
    ]),
    z.object({ and: z.array(z.unknown()) }),
    z.object({ or: z.array(z.unknown()) }),
    z.object({ not: z.unknown() }),
    z.object({ never: z.object({}).partial() }),
    z.object({ always: z.object({}).partial() }),
  ]),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_streams_name_group_Body = z.object({
  group: z.object({
    members: z.array(z.string()),
    metadata: z.record(z.string()),
    tags: z.array(z.string()),
  }),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_streams_name_ingest_Body = z.object({
  ingest: z.union([
    z
      .object({
        lifecycle: z.union([
          z.object({ dsl: z.object({ data_retention: z.string().min(1) }).partial() }),
          z.object({ ilm: z.object({ policy: z.string().min(1) }) }),
          z.object({ inherit: z.object({}).partial() }),
        ]),
        processing: z.object({
          steps: z.array(
            z.union([
              z.union([
                z.object({
                  action: z.literal('grok'),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  from: z.string().min(1),
                  ignore_failure: z.boolean().optional(),
                  ignore_missing: z.boolean().optional(),
                  patterns: z.array(z.string().min(1)).min(1),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('dissect'),
                  append_separator: z.string().min(1).optional(),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  from: z.string().min(1),
                  ignore_failure: z.boolean().optional(),
                  ignore_missing: z.boolean().optional(),
                  pattern: z.string().min(1),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('date'),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  formats: z.array(z.string().min(1)),
                  from: z.string().min(1),
                  ignore_failure: z.boolean().optional(),
                  output_format: z.string().min(1).optional(),
                  to: z.string().min(1).optional(),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('rename'),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  from: z.string().min(1),
                  ignore_failure: z.boolean().optional(),
                  ignore_missing: z.boolean().optional(),
                  override: z.boolean().optional(),
                  to: z.string().min(1),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('set'),
                  copy_from: z.string().min(1).optional(),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  ignore_failure: z.boolean().optional(),
                  override: z.boolean().optional(),
                  to: z.string().min(1),
                  value: z.string().min(1).optional(),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('append'),
                  allow_duplicates: z.boolean().optional(),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  ignore_failure: z.boolean().optional(),
                  to: z.string().min(1),
                  value: z.array(z.unknown()).min(1),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('manual_ingest_pipeline'),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  ignore_failure: z.boolean().optional(),
                  on_failure: z.array(z.object({}).partial().passthrough()).optional(),
                  processors: z.array(
                    z.object({
                      append: z.unknown(),
                      attachment: z.unknown(),
                      bytes: z.unknown(),
                      circle: z.unknown(),
                      community_id: z.unknown(),
                      convert: z.unknown(),
                      csv: z.unknown(),
                      date: z.unknown(),
                      date_index_name: z.unknown(),
                      dissect: z.unknown(),
                      dot_expander: z.unknown(),
                      drop: z.unknown(),
                      enrich: z.unknown(),
                      fail: z.unknown(),
                      fingerprint: z.unknown(),
                      foreach: z.unknown(),
                      geo_grid: z.unknown(),
                      geoip: z.unknown(),
                      grok: z.unknown(),
                      gsub: z.unknown(),
                      html_strip: z.unknown(),
                      inference: z.unknown(),
                      ip_location: z.unknown(),
                      join: z.unknown(),
                      json: z.unknown(),
                      kv: z.unknown(),
                      lowercase: z.unknown(),
                      network_direction: z.unknown(),
                      pipeline: z.unknown(),
                      redact: z.unknown(),
                      registered_domain: z.unknown(),
                      remove: z.unknown(),
                      rename: z.unknown(),
                      reroute: z.unknown(),
                      script: z.unknown(),
                      set: z.unknown(),
                      set_security_user: z.unknown(),
                      sort: z.unknown(),
                      split: z.unknown(),
                      terminate: z.unknown(),
                      trim: z.unknown(),
                      uppercase: z.unknown(),
                      uri_parts: z.unknown(),
                      urldecode: z.unknown(),
                      user_agent: z.unknown(),
                    })
                  ),
                  tag: z.string().optional(),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
              ]),
              z.object({
                customIdentifier: z.string().optional(),
                where: z
                  .union([
                    z.union([
                      z.object({
                        contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        field: z.string().min(1),
                        gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        range: z
                          .object({
                            gt: z.union([z.string(), z.number(), z.boolean()]),
                            gte: z.union([z.string(), z.number(), z.boolean()]),
                            lt: z.union([z.string(), z.number(), z.boolean()]),
                            lte: z.union([z.string(), z.number(), z.boolean()]),
                          })
                          .partial()
                          .optional(),
                        startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                      }),
                      z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                    ]),
                    z.object({ and: z.array(z.unknown()) }),
                    z.object({ or: z.array(z.unknown()) }),
                    z.object({ not: z.unknown() }),
                    z.object({ never: z.object({}).partial() }),
                    z.object({ always: z.object({}).partial() }),
                  ])
                  .and(z.object({ steps: z.array(z.unknown()) }).passthrough()),
              }),
            ])
          ),
        }),
        settings: z
          .object({
            'index.number_of_replicas': z.object({ value: z.number() }),
            'index.number_of_shards': z.object({ value: z.number() }),
            'index.refresh_interval': z.object({ value: z.union([z.string(), z.literal(-1)]) }),
          })
          .partial(),
      })
      .passthrough()
      .and(
        z
          .object({
            wired: z.object({
              fields: z.record(
                z
                  .record(
                    z.union([
                      z.union([z.string(), z.number(), z.boolean(), z.unknown(), z.unknown()]),
                      z.array(
                        z.union([z.string(), z.number(), z.boolean(), z.unknown(), z.unknown()])
                      ),
                      z.unknown(),
                    ])
                  )
                  .and(
                    z.union([
                      z.object({
                        format: z.string().min(1).optional(),
                        type: z.enum([
                          'keyword',
                          'match_only_text',
                          'long',
                          'double',
                          'date',
                          'boolean',
                          'ip',
                        ]),
                      }),
                      z.object({ type: z.literal('system') }),
                    ])
                  )
              ),
              routing: z.array(
                z.object({
                  destination: z.string().min(1),
                  status: z.enum(['enabled', 'disabled']).optional(),
                  where: z.union([
                    z.union([
                      z.object({
                        contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        field: z.string().min(1),
                        gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        range: z
                          .object({
                            gt: z.union([z.string(), z.number(), z.boolean()]),
                            gte: z.union([z.string(), z.number(), z.boolean()]),
                            lt: z.union([z.string(), z.number(), z.boolean()]),
                            lte: z.union([z.string(), z.number(), z.boolean()]),
                          })
                          .partial()
                          .optional(),
                        startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                      }),
                      z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                    ]),
                    z.object({ and: z.array(z.unknown()) }),
                    z.object({ or: z.array(z.unknown()) }),
                    z.object({ not: z.unknown() }),
                    z.object({ never: z.object({}).partial() }),
                    z.object({ always: z.object({}).partial() }),
                  ]),
                })
              ),
            }),
          })
          .passthrough()
      ),
    z
      .object({
        lifecycle: z.union([
          z.object({ dsl: z.object({ data_retention: z.string().min(1) }).partial() }),
          z.object({ ilm: z.object({ policy: z.string().min(1) }) }),
          z.object({ inherit: z.object({}).partial() }),
        ]),
        processing: z.object({
          steps: z.array(
            z.union([
              z.union([
                z.object({
                  action: z.literal('grok'),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  from: z.string().min(1),
                  ignore_failure: z.boolean().optional(),
                  ignore_missing: z.boolean().optional(),
                  patterns: z.array(z.string().min(1)).min(1),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('dissect'),
                  append_separator: z.string().min(1).optional(),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  from: z.string().min(1),
                  ignore_failure: z.boolean().optional(),
                  ignore_missing: z.boolean().optional(),
                  pattern: z.string().min(1),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('date'),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  formats: z.array(z.string().min(1)),
                  from: z.string().min(1),
                  ignore_failure: z.boolean().optional(),
                  output_format: z.string().min(1).optional(),
                  to: z.string().min(1).optional(),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('rename'),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  from: z.string().min(1),
                  ignore_failure: z.boolean().optional(),
                  ignore_missing: z.boolean().optional(),
                  override: z.boolean().optional(),
                  to: z.string().min(1),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('set'),
                  copy_from: z.string().min(1).optional(),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  ignore_failure: z.boolean().optional(),
                  override: z.boolean().optional(),
                  to: z.string().min(1),
                  value: z.string().min(1).optional(),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('append'),
                  allow_duplicates: z.boolean().optional(),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  ignore_failure: z.boolean().optional(),
                  to: z.string().min(1),
                  value: z.array(z.unknown()).min(1),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
                z.object({
                  action: z.literal('manual_ingest_pipeline'),
                  customIdentifier: z.string().min(1).optional(),
                  description: z.string().optional(),
                  ignore_failure: z.boolean().optional(),
                  on_failure: z.array(z.object({}).partial().passthrough()).optional(),
                  processors: z.array(
                    z.object({
                      append: z.unknown(),
                      attachment: z.unknown(),
                      bytes: z.unknown(),
                      circle: z.unknown(),
                      community_id: z.unknown(),
                      convert: z.unknown(),
                      csv: z.unknown(),
                      date: z.unknown(),
                      date_index_name: z.unknown(),
                      dissect: z.unknown(),
                      dot_expander: z.unknown(),
                      drop: z.unknown(),
                      enrich: z.unknown(),
                      fail: z.unknown(),
                      fingerprint: z.unknown(),
                      foreach: z.unknown(),
                      geo_grid: z.unknown(),
                      geoip: z.unknown(),
                      grok: z.unknown(),
                      gsub: z.unknown(),
                      html_strip: z.unknown(),
                      inference: z.unknown(),
                      ip_location: z.unknown(),
                      join: z.unknown(),
                      json: z.unknown(),
                      kv: z.unknown(),
                      lowercase: z.unknown(),
                      network_direction: z.unknown(),
                      pipeline: z.unknown(),
                      redact: z.unknown(),
                      registered_domain: z.unknown(),
                      remove: z.unknown(),
                      rename: z.unknown(),
                      reroute: z.unknown(),
                      script: z.unknown(),
                      set: z.unknown(),
                      set_security_user: z.unknown(),
                      sort: z.unknown(),
                      split: z.unknown(),
                      terminate: z.unknown(),
                      trim: z.unknown(),
                      uppercase: z.unknown(),
                      uri_parts: z.unknown(),
                      urldecode: z.unknown(),
                      user_agent: z.unknown(),
                    })
                  ),
                  tag: z.string().optional(),
                  where: z
                    .union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ])
                    .optional(),
                }),
              ]),
              z.object({
                customIdentifier: z.string().optional(),
                where: z
                  .union([
                    z.union([
                      z.object({
                        contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        field: z.string().min(1),
                        gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        range: z
                          .object({
                            gt: z.union([z.string(), z.number(), z.boolean()]),
                            gte: z.union([z.string(), z.number(), z.boolean()]),
                            lt: z.union([z.string(), z.number(), z.boolean()]),
                            lte: z.union([z.string(), z.number(), z.boolean()]),
                          })
                          .partial()
                          .optional(),
                        startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                      }),
                      z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                    ]),
                    z.object({ and: z.array(z.unknown()) }),
                    z.object({ or: z.array(z.unknown()) }),
                    z.object({ not: z.unknown() }),
                    z.object({ never: z.object({}).partial() }),
                    z.object({ always: z.object({}).partial() }),
                  ])
                  .and(z.object({ steps: z.array(z.unknown()) }).passthrough()),
              }),
            ])
          ),
        }),
        settings: z
          .object({
            'index.number_of_replicas': z.object({ value: z.number() }),
            'index.number_of_shards': z.object({ value: z.number() }),
            'index.refresh_interval': z.object({ value: z.union([z.string(), z.literal(-1)]) }),
          })
          .partial(),
      })
      .passthrough()
      .and(
        z
          .object({
            classic: z
              .object({
                field_overrides: z.record(
                  z
                    .record(
                      z.union([
                        z.union([z.string(), z.number(), z.boolean(), z.unknown(), z.unknown()]),
                        z.array(
                          z.union([z.string(), z.number(), z.boolean(), z.unknown(), z.unknown()])
                        ),
                        z.unknown(),
                      ])
                    )
                    .and(
                      z.union([
                        z.object({
                          format: z.string().min(1).optional(),
                          type: z.enum([
                            'keyword',
                            'match_only_text',
                            'long',
                            'double',
                            'date',
                            'boolean',
                            'ip',
                          ]),
                        }),
                        z.object({ type: z.literal('system') }),
                      ])
                    )
                ),
              })
              .partial(),
          })
          .passthrough()
      ),
  ]),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_streams_name_content_export_Body = z.object({
  description: z.string(),
  include: z.union([
    z.object({ objects: z.object({ all: z.object({}).partial() }) }),
    z.object({
      objects: z.object({
        mappings: z.boolean(),
        queries: z.array(z.object({ id: z.string() })),
        routing: z.array(z.unknown().and(z.object({ destination: z.string() }).passthrough())),
      }),
    }),
  ]),
  name: z.string(),
  version: z.string(),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_streams_name_dashboards_bulk_Body = z.object({
  operations: z.array(
    z.union([
      z.object({ index: z.object({ id: z.string() }) }),
      z.object({ delete: z.object({ id: z.string() }) }),
    ])
  ),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_streams_name_queries_bulk_Body = z.object({
  operations: z.array(
    z.union([
      z.object({
        index: z
          .object({ id: z.string().min(1), title: z.string().min(1) })
          .passthrough()
          .and(
            z
              .object({
                kql: z.object({ query: z.string() }),
                system: z
                  .object({
                    filter: z.union([
                      z.union([
                        z.object({
                          contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          field: z.string().min(1),
                          gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
                          range: z
                            .object({
                              gt: z.union([z.string(), z.number(), z.boolean()]),
                              gte: z.union([z.string(), z.number(), z.boolean()]),
                              lt: z.union([z.string(), z.number(), z.boolean()]),
                              lte: z.union([z.string(), z.number(), z.boolean()]),
                            })
                            .partial()
                            .optional(),
                          startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
                        }),
                        z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
                      ]),
                      z.object({ and: z.array(z.unknown()) }),
                      z.object({ or: z.array(z.unknown()) }),
                      z.object({ not: z.unknown() }),
                      z.object({ never: z.object({}).partial() }),
                      z.object({ always: z.object({}).partial() }),
                    ]),
                    name: z.string().min(1),
                  })
                  .optional(),
              })
              .passthrough()
          ),
      }),
      z.object({ delete: z.object({ id: z.string() }) }),
    ])
  ),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_streams_name_queries_queryid_Body = z.object({
  kql: z.object({ query: z.string() }),
  system: z
    .object({
      filter: z.union([
        z.union([
          z.object({
            contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
            endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
            eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
            field: z.string().min(1),
            gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
            gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
            lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
            lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
            neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
            range: z
              .object({
                gt: z.union([z.string(), z.number(), z.boolean()]),
                gte: z.union([z.string(), z.number(), z.boolean()]),
                lt: z.union([z.string(), z.number(), z.boolean()]),
                lte: z.union([z.string(), z.number(), z.boolean()]),
              })
              .partial()
              .optional(),
            startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
          }),
          z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
        ]),
        z.object({ and: z.array(z.unknown()) }),
        z.object({ or: z.array(z.unknown()) }),
        z.object({ not: z.unknown() }),
        z.object({ never: z.object({}).partial() }),
        z.object({ always: z.object({}).partial() }),
      ]),
      name: z.string().min(1),
    })
    .optional(),
  title: z.string().min(1),
});
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_streams_name_significant_events_generate_Body = z
  .object({
    system: z.object({
      description: z.string(),
      filter: z.union([
        z.union([
          z.object({
            contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
            endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
            eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
            field: z.string().min(1),
            gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
            gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
            lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
            lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
            neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
            range: z
              .object({
                gt: z.union([z.string(), z.number(), z.boolean()]),
                gte: z.union([z.string(), z.number(), z.boolean()]),
                lt: z.union([z.string(), z.number(), z.boolean()]),
                lte: z.union([z.string(), z.number(), z.boolean()]),
              })
              .partial()
              .optional(),
            startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
          }),
          z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
        ]),
        z.object({ and: z.array(z.unknown()) }),
        z.object({ or: z.array(z.unknown()) }),
        z.object({ not: z.unknown() }),
        z.object({ never: z.object({}).partial() }),
        z.object({ always: z.object({}).partial() }),
      ]),
      name: z.string().min(1),
    }),
  })
  .partial();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_streams_name_significant_events_preview_Body = z.object({
  query: z.object({
    kql: z.object({ query: z.string() }),
    system: z
      .object({
        filter: z.union([
          z.union([
            z.object({
              contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
              endsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
              eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
              field: z.string().min(1),
              gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
              gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
              lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
              lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
              neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
              range: z
                .object({
                  gt: z.union([z.string(), z.number(), z.boolean()]),
                  gte: z.union([z.string(), z.number(), z.boolean()]),
                  lt: z.union([z.string(), z.number(), z.boolean()]),
                  lte: z.union([z.string(), z.number(), z.boolean()]),
                })
                .partial()
                .optional(),
              startsWith: z.union([z.string(), z.number(), z.boolean()]).optional(),
            }),
            z.object({ exists: z.boolean().optional(), field: z.string().min(1) }),
          ]),
          z.object({ and: z.array(z.unknown()) }),
          z.object({ or: z.array(z.unknown()) }),
          z.object({ not: z.unknown() }),
          z.object({ never: z.object({}).partial() }),
          z.object({ always: z.object({}).partial() }),
        ]),
        name: z.string().min(1),
      })
      .optional(),
  }),
});

export const locations = z.union([z.string(), z.array(z.any())]).optional();

export const monitorTypes = z
  .union([z.enum(['browser', 'http', 'icmp', 'tcp']), z.array(z.any())])
  .optional();

export const schedules = z.union([z.array(z.any()), z.string()]).optional();

export const useLogicalAndFor = z
  .union([z.enum(['tags', 'locations']), z.array(z.enum(['tags', 'locations']))])
  .optional();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_commonMonitorFields = z
  .object({
    alert: z.object({}).partial().passthrough().optional(),
    enabled: z.boolean().optional().default(true),
    labels: z.record(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    name: z.string(),
    namespace: z.string().optional().default('default'),
    params: z.string().optional(),
    private_locations: z.array(z.string()).optional(),
    retest_on_failure: z.boolean().optional().default(true),
    schedule: z.number().optional(),
    'service.name': z.string().optional(),
    tags: z.array(z.string()).optional(),
    timeout: z.number().optional().default(16),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_browserMonitorFields = Synthetics_commonMonitorFields.and(
  z
    .object({
      ignore_https_errors: z.boolean().optional().default(false),
      inline_script: z.string(),
      playwright_options: z.object({}).partial().passthrough().optional(),
      screenshots: z.enum(['on', 'off', 'only-on-failure']).optional().default('on'),
      synthetics_args: z.array(z.any()).optional(),
      type: z.literal('browser'),
    })
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_httpMonitorFields = Synthetics_commonMonitorFields.and(
  z
    .object({
      check: z
        .object({
          request: z
            .object({
              body: z.string(),
              headers: z.object({}).partial().passthrough(),
              method: z.enum(['HEAD', 'GET', 'POST', 'OPTIONS']),
            })
            .partial()
            .passthrough(),
          response: z
            .object({
              body: z.object({}).partial().passthrough(),
              headers: z.object({}).partial().passthrough(),
            })
            .partial()
            .passthrough(),
        })
        .partial()
        .passthrough()
        .optional(),
      ipv4: z.boolean().optional().default(true),
      ipv6: z.boolean().optional().default(true),
      max_redirects: z.number().optional().default(0),
      mode: z.enum(['all', 'any']).optional().default('any'),
      password: z.string().optional(),
      proxy_headers: z.object({}).partial().passthrough().optional(),
      proxy_url: z.string().optional(),
      response: z.object({}).partial().passthrough().optional(),
      ssl: z.object({}).partial().passthrough().optional(),
      type: z.literal('http'),
      url: z.string(),
      username: z.string().optional(),
    })
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_icmpMonitorFields = Synthetics_commonMonitorFields.and(
  z
    .object({ host: z.string(), type: z.literal('icmp'), wait: z.number().optional().default(1) })
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_tcpMonitorFields = Synthetics_commonMonitorFields.and(
  z
    .object({
      host: z.string(),
      proxy_url: z.string().optional(),
      proxy_use_local_resolver: z.boolean().optional().default(false),
      ssl: z.object({}).partial().passthrough().optional(),
      type: z.literal('tcp'),
    })
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_synthetic_monitors_Body = z.union([
  Synthetics_browserMonitorFields,
  Synthetics_httpMonitorFields,
  Synthetics_icmpMonitorFields,
  Synthetics_tcpMonitorFields,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const delete_synthetic_monitors_Body = z.object({ ids: z.array(z.string()) }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_getParameterResponse = z
  .object({
    description: z.string(),
    id: z.string(),
    key: z.string(),
    namespaces: z.array(z.string()),
    tags: z.array(z.string()),
    value: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_parameterRequest = z
  .object({
    description: z.string().optional(),
    key: z.string(),
    share_across_spaces: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    value: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_parameters_Body = z.union([
  z.array(Synthetics_parameterRequest),
  Synthetics_parameterRequest,
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_postParameterResponse = z
  .object({
    description: z.string(),
    id: z.string(),
    key: z.string(),
    share_across_spaces: z.boolean(),
    tags: z.array(z.string()),
    value: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_parameter_Body = z
  .object({
    description: z.string(),
    key: z.string(),
    tags: z.array(z.string()),
    value: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Synthetics_getPrivateLocation = z
  .object({
    agentPolicyId: z.string(),
    geo: z.object({ lat: z.number(), lon: z.number() }).passthrough(),
    id: z.string(),
    isInvalid: z.boolean(),
    label: z.string(),
    namespace: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const post_private_location_Body = z
  .object({
    agentPolicyId: z.string(),
    geo: z.object({ lat: z.number(), lon: z.number() }).passthrough().optional(),
    label: z.string(),
    spaces: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Task_manager_health_APIs_configuration = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Task_manager_health_APIs_workload = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Task_manager_health_APIs_health_response = z
  .object({
    id: z.string(),
    last_update: z.string(),
    stats: z
      .object({
        capacity_estimation: z.object({}).partial().passthrough(),
        configuration: Task_manager_health_APIs_configuration,
        runtime: z.object({}).partial().passthrough(),
        workload: Task_manager_health_APIs_workload,
      })
      .partial()
      .passthrough(),
    status: z.string(),
    timestamp: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DeleteTimelines_Body = z
  .object({ savedObjectIds: z.array(z.string()), searchIds: z.array(z.string()).optional() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_ColumnHeaderResult = z
  .object({
    aggregatable: z.boolean().nullable(),
    category: z.string().nullable(),
    columnHeaderType: z.string().nullable(),
    description: z.string().nullable(),
    example: z.string().nullable(),
    id: z.string().nullable(),
    indexes: z.array(z.string()).nullable(),
    name: z.string().nullable(),
    placeholder: z.string().nullable(),
    searchable: z.boolean().nullable(),
    type: z.string().nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_QueryMatchResult = z
  .object({
    displayField: z.string().nullable(),
    displayValue: z.string().nullable(),
    field: z.string().nullable(),
    operator: z.string().nullable(),
    value: z.union([z.string(), z.array(z.string())]),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_DataProviderType = z.enum(['default', 'template']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_DataProviderQueryMatch = z
  .object({
    enabled: z.boolean().nullable(),
    excluded: z.boolean().nullable(),
    id: z.string().nullable(),
    kqlQuery: z.string().nullable(),
    name: z.string().nullable(),
    queryMatch: Security_Timeline_API_QueryMatchResult,
    type: Security_Timeline_API_DataProviderType,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_DataProviderResult = z
  .object({
    and: z.array(Security_Timeline_API_DataProviderQueryMatch).nullable(),
    enabled: z.boolean().nullable(),
    excluded: z.boolean().nullable(),
    id: z.string().nullable(),
    kqlQuery: z.string().nullable(),
    name: z.string().nullable(),
    queryMatch: Security_Timeline_API_QueryMatchResult,
    type: Security_Timeline_API_DataProviderType,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_RowRendererId = z.enum([
  'alert',
  'alerts',
  'auditd',
  'auditd_file',
  'library',
  'netflow',
  'plain',
  'registry',
  'suricata',
  'system',
  'system_dns',
  'system_endgame_process',
  'system_file',
  'system_fim',
  'system_security_event',
  'system_socket',
  'threat_match',
  'zeek',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_FavoriteTimelineResult = z
  .object({
    favoriteDate: z.number().nullable(),
    fullName: z.string().nullable(),
    userName: z.string().nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_FilterTimelineResult = z
  .object({
    exists: z.string().nullable(),
    match_all: z.string().nullable(),
    meta: z
      .object({
        alias: z.string().nullable(),
        controlledBy: z.string().nullable(),
        disabled: z.boolean().nullable(),
        field: z.string().nullable(),
        formattedValue: z.string().nullable(),
        index: z.string().nullable(),
        key: z.string().nullable(),
        negate: z.boolean().nullable(),
        params: z.string().nullable(),
        type: z.string().nullable(),
        value: z.string().nullable(),
      })
      .partial()
      .passthrough()
      .nullable(),
    missing: z.string().nullable(),
    query: z.string().nullable(),
    range: z.string().nullable(),
    script: z.string().nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_SerializedFilterQueryResult = z
  .object({
    filterQuery: z
      .object({
        kuery: z
          .object({ expression: z.string().nullable(), kind: z.string().nullable() })
          .partial()
          .passthrough()
          .nullable(),
        serializedQuery: z.string().nullable(),
      })
      .partial()
      .passthrough()
      .nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_SortObject = z
  .object({
    columnId: z.string().nullable(),
    columnType: z.string().nullable(),
    sortDirection: z.string().nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_Sort = z.union([
  Security_Timeline_API_SortObject,
  z.array(Security_Timeline_API_SortObject),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_TimelineStatus = z.enum(['active', 'draft', 'immutable']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_TimelineType = z.enum(['default', 'template']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_SavedTimeline = z
  .object({
    columns: z.array(Security_Timeline_API_ColumnHeaderResult).nullable(),
    created: z.number().nullable(),
    createdBy: z.string().nullable(),
    dataProviders: z.array(Security_Timeline_API_DataProviderResult).nullable(),
    dataViewId: z.string().nullable(),
    dateRange: z
      .object({ end: z.union([z.string(), z.number()]), start: z.union([z.string(), z.number()]) })
      .partial()
      .passthrough()
      .nullable(),
    description: z.string().nullable(),
    eqlOptions: z
      .object({
        eventCategoryField: z.string().nullable(),
        query: z.string().nullable(),
        size: z.union([z.string(), z.number()]),
        tiebreakerField: z.string().nullable(),
        timestampField: z.string().nullable(),
      })
      .partial()
      .passthrough()
      .nullable(),
    eventType: z.string().nullable(),
    excludedRowRendererIds: z.array(Security_Timeline_API_RowRendererId).nullable(),
    favorite: z.array(Security_Timeline_API_FavoriteTimelineResult).nullable(),
    filters: z.array(Security_Timeline_API_FilterTimelineResult).nullable(),
    indexNames: z.array(z.string()).nullable(),
    kqlMode: z.string().nullable(),
    kqlQuery: Security_Timeline_API_SerializedFilterQueryResult,
    savedQueryId: z.string().nullable(),
    savedSearchId: z.string().nullable(),
    sort: Security_Timeline_API_Sort,
    status: Security_Timeline_API_TimelineStatus,
    templateTimelineId: z.string().nullable(),
    templateTimelineVersion: z.number().nullable(),
    timelineType: Security_Timeline_API_TimelineType,
    title: z.string().nullable(),
    updated: z.number().nullable(),
    updatedBy: z.string().nullable(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_SavedTimelineWithSavedObjectId =
  Security_Timeline_API_SavedTimeline.and(
    z.object({ savedObjectId: z.string(), version: z.string() }).passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_TimelineResponse = Security_Timeline_API_SavedTimeline.and(
  Security_Timeline_API_SavedTimelineWithSavedObjectId
).and(
  z
    .object({
      eventIdToNoteIds: z.array(Security_Timeline_API_Note).nullable(),
      noteIds: z.array(z.string()).nullable(),
      notes: z.array(Security_Timeline_API_Note).nullable(),
      pinnedEventIds: z.array(z.string()).nullable(),
      pinnedEventsSaveObject: z.array(Security_Timeline_API_PinnedEvent).nullable(),
    })
    .partial()
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PatchTimeline_Body = z
  .object({
    timeline: Security_Timeline_API_SavedTimeline,
    timelineId: z.string().nullable(),
    version: z.string().nullable(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateTimelines_Body = z
  .object({
    status: Security_Timeline_API_TimelineStatus.optional(),
    templateTimelineId: z.string().nullish(),
    templateTimelineVersion: z.number().nullish(),
    timeline: Security_Timeline_API_SavedTimeline,
    timelineId: z.string().nullish(),
    timelineType: Security_Timeline_API_TimelineType.optional(),
    version: z.string().nullish(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CopyTimeline_Body = z
  .object({ timeline: Security_Timeline_API_SavedTimeline, timelineIdToCopy: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CleanDraftTimelines_Body = z
  .object({ timelineType: Security_Timeline_API_TimelineType })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ExportTimelines_Body = z
  .object({ ids: z.array(z.string()).nullable() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PersistFavoriteRoute_Body = z
  .object({
    templateTimelineId: z.string().nullable(),
    templateTimelineVersion: z.number().nullable(),
    timelineId: z.string().nullable(),
    timelineType: Security_Timeline_API_TimelineType,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_FavoriteTimelineResponse = z
  .object({
    favorite: z.array(Security_Timeline_API_FavoriteTimelineResult).optional(),
    savedObjectId: z.string(),
    templateTimelineId: z.string().nullish(),
    templateTimelineVersion: z.number().nullish(),
    timelineType: Security_Timeline_API_TimelineType.optional(),
    version: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ImportTimelines_Body = z
  .object({ file: z.unknown(), isImmutable: z.enum(['true', 'false']).optional() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_ImportTimelineResult = z
  .object({
    errors: z.array(
      z
        .object({
          error: z.object({ message: z.string(), status_code: z.number() }).partial().passthrough(),
          id: z.string(),
        })
        .partial()
        .passthrough()
    ),
    success: z.boolean(),
    success_count: z.number(),
    timelines_installed: z.number(),
    timelines_updated: z.number(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_TimelineSavedToReturnObject =
  Security_Timeline_API_SavedTimeline.and(
    z
      .object({
        eventIdToNoteIds: z.array(Security_Timeline_API_Note).nullish(),
        noteIds: z.array(z.string()).nullish(),
        notes: z.array(Security_Timeline_API_Note).nullish(),
        pinnedEventIds: z.array(z.string()).nullish(),
        pinnedEventsSaveObject: z.array(Security_Timeline_API_PinnedEvent).nullish(),
        savedObjectId: z.string(),
        version: z.string(),
      })
      .passthrough()
  );
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_ImportTimelines = Security_Timeline_API_SavedTimeline.and(
  z
    .object({
      eventNotes: z.array(Security_Timeline_API_BareNote).nullable(),
      globalNotes: z.array(Security_Timeline_API_BareNote).nullable(),
      pinnedEventIds: z.array(z.string()).nullable(),
      savedObjectId: z.string().nullable(),
      version: z.string().nullable(),
    })
    .passthrough()
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const InstallPrepackedTimelines_Body: z.ZodType<any> = z
  .object({
    prepackagedTimelines: z.array(Security_Timeline_API_TimelineSavedToReturnObject.nullable()),
    timelinesToInstall: z.array(Security_Timeline_API_ImportTimelines.nullable()),
    timelinesToUpdate: z.array(Security_Timeline_API_ImportTimelines.nullable()),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_SavedObjectResolveAliasPurpose = z.enum([
  'savedObjectConversion',
  'savedObjectImport',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_SavedObjectResolveOutcome = z.enum([
  'exactMatch',
  'aliasMatch',
  'conflict',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_ResolvedTimeline = z
  .object({
    alias_purpose: Security_Timeline_API_SavedObjectResolveAliasPurpose.optional(),
    alias_target_id: z.string().optional(),
    outcome: Security_Timeline_API_SavedObjectResolveOutcome,
    timeline: Security_Timeline_API_TimelineSavedToReturnObject,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const put_uptime_settings_Body = z
  .object({
    certAgeThreshold: z.number().default(730),
    certExpirationThreshold: z.number().default(30),
    defaultConnectors: z.array(z.any()).default([]),
    defaultEmail: z
      .object({
        bcc: z.array(z.string()).default([]),
        cc: z.array(z.string()).default([]),
        to: z.array(z.string()).default([]),
      })
      .partial()
      .passthrough(),
    heartbeatIndices: z.string().default('heartbeat-*'),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_budgeting_method = z.enum(['occurrences', 'timeslices']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_group_by = z.union([z.string(), z.array(z.string())]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_filter_meta = z
  .object({
    alias: z.string().nullable(),
    controlledBy: z.string(),
    disabled: z.boolean(),
    field: z.string(),
    group: z.string(),
    index: z.string(),
    isMultiIndex: z.boolean(),
    key: z.string(),
    negate: z.boolean(),
    params: z.object({}).partial().passthrough(),
    type: z.string(),
    value: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_filter = z
  .object({ meta: SLOs_filter_meta, query: z.object({}).partial().passthrough() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_kql_with_filters = z.union([
  z.string(),
  z
    .object({ filters: z.array(SLOs_filter), kqlQuery: z.string() })
    .partial()
    .passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_kql_with_filters_good = z.union([
  z.string(),
  z
    .object({ filters: z.array(SLOs_filter), kqlQuery: z.string() })
    .partial()
    .passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_kql_with_filters_total = z.union([
  z.string(),
  z
    .object({ filters: z.array(SLOs_filter), kqlQuery: z.string() })
    .partial()
    .passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_indicator_properties_custom_kql = z
  .object({
    params: z
      .object({
        dataViewId: z.string().optional(),
        filter: SLOs_kql_with_filters.optional(),
        good: SLOs_kql_with_filters_good,
        index: z.string(),
        timestampField: z.string(),
        total: SLOs_kql_with_filters_total,
      })
      .passthrough(),
    type: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_indicator_properties_apm_availability = z
  .object({
    params: z
      .object({
        environment: z.string(),
        filter: z.string().optional(),
        index: z.string(),
        service: z.string(),
        transactionName: z.string(),
        transactionType: z.string(),
      })
      .passthrough(),
    type: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_indicator_properties_apm_latency = z
  .object({
    params: z
      .object({
        environment: z.string(),
        filter: z.string().optional(),
        index: z.string(),
        service: z.string(),
        threshold: z.number(),
        transactionName: z.string(),
        transactionType: z.string(),
      })
      .passthrough(),
    type: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_indicator_properties_custom_metric = z
  .object({
    params: z
      .object({
        dataViewId: z.string().optional(),
        filter: z.string().optional(),
        good: z
          .object({
            equation: z.string(),
            metrics: z.array(
              z.union([
                z
                  .object({
                    aggregation: z.literal('sum'),
                    field: z.string(),
                    filter: z.string().optional(),
                    name: z.string().regex(/^[A-Z]$/),
                  })
                  .passthrough(),
                z
                  .object({
                    aggregation: z.literal('doc_count'),
                    filter: z.string().optional(),
                    name: z.string().regex(/^[A-Z]$/),
                  })
                  .passthrough(),
              ])
            ),
          })
          .passthrough(),
        index: z.string(),
        timestampField: z.string(),
        total: z
          .object({
            equation: z.string(),
            metrics: z.array(
              z.union([
                z
                  .object({
                    aggregation: z.literal('sum'),
                    field: z.string(),
                    filter: z.string().optional(),
                    name: z.string().regex(/^[A-Z]$/),
                  })
                  .passthrough(),
                z
                  .object({
                    aggregation: z.literal('doc_count'),
                    filter: z.string().optional(),
                    name: z.string().regex(/^[A-Z]$/),
                  })
                  .passthrough(),
              ])
            ),
          })
          .passthrough(),
      })
      .passthrough(),
    type: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_indicator_properties_histogram = z
  .object({
    params: z
      .object({
        dataViewId: z.string().optional(),
        filter: z.string().optional(),
        good: z
          .object({
            aggregation: z.enum(['value_count', 'range']),
            field: z.string(),
            filter: z.string().optional(),
            from: z.number().optional(),
            to: z.number().optional(),
          })
          .passthrough(),
        index: z.string(),
        timestampField: z.string(),
        total: z
          .object({
            aggregation: z.enum(['value_count', 'range']),
            field: z.string(),
            filter: z.string().optional(),
            from: z.number().optional(),
            to: z.number().optional(),
          })
          .passthrough(),
      })
      .passthrough(),
    type: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_timeslice_metric_basic_metric_with_field = z
  .object({
    aggregation: z.enum(['sum', 'avg', 'min', 'max', 'std_deviation', 'last_value', 'cardinality']),
    field: z.string(),
    filter: z.string().optional(),
    name: z.string().regex(/^[A-Z]$/),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_timeslice_metric_percentile_metric = z
  .object({
    aggregation: z.literal('percentile'),
    field: z.string(),
    filter: z.string().optional(),
    name: z.string().regex(/^[A-Z]$/),
    percentile: z.number(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_timeslice_metric_doc_count_metric = z
  .object({
    aggregation: z.literal('doc_count'),
    filter: z.string().optional(),
    name: z.string().regex(/^[A-Z]$/),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_indicator_properties_timeslice_metric = z
  .object({
    params: z
      .object({
        dataViewId: z.string().optional(),
        filter: z.string().optional(),
        index: z.string(),
        metric: z
          .object({
            comparator: z.enum(['GT', 'GTE', 'LT', 'LTE']),
            equation: z.string(),
            metrics: z.array(
              z.union([
                SLOs_timeslice_metric_basic_metric_with_field,
                SLOs_timeslice_metric_percentile_metric,
                SLOs_timeslice_metric_doc_count_metric,
              ])
            ),
            threshold: z.number(),
          })
          .passthrough(),
        timestampField: z.string(),
      })
      .passthrough(),
    type: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_objective = z
  .object({
    target: z.number().gt(0).lt(100),
    timesliceTarget: z.number().gte(0).lte(100).optional(),
    timesliceWindow: z.string().optional(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_settings = z
  .object({
    frequency: z.string().default('1m'),
    preventInitialBackfill: z.boolean().default(false),
    syncDelay: z.string().default('1m'),
    syncField: z.string(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_error_budget = z
  .object({
    consumed: z.number(),
    initial: z.number(),
    isEstimated: z.boolean(),
    remaining: z.number(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_summary_status = z.enum(['NO_DATA', 'HEALTHY', 'DEGRADING', 'VIOLATED']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_summary = z
  .object({ errorBudget: SLOs_error_budget, sliValue: z.number(), status: SLOs_summary_status })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_time_window = z
  .object({ duration: z.string(), type: z.enum(['rolling', 'calendarAligned']) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_slo_with_summary_response: z.ZodType<any> = z
  .object({
    budgetingMethod: SLOs_budgeting_method,
    createdAt: z.string(),
    description: z.string(),
    enabled: z.boolean(),
    groupBy: SLOs_group_by,
    id: z.string(),
    indicator: z.union([
      SLOs_indicator_properties_custom_kql,
      SLOs_indicator_properties_apm_availability,
      SLOs_indicator_properties_apm_latency,
      SLOs_indicator_properties_custom_metric,
      SLOs_indicator_properties_histogram,
      SLOs_indicator_properties_timeslice_metric,
    ]),
    instanceId: z.string(),
    name: z.string(),
    objective: SLOs_objective,
    revision: z.number(),
    settings: SLOs_settings,
    summary: SLOs_summary,
    tags: z.array(z.string()),
    timeWindow: SLOs_time_window,
    updatedAt: z.string(),
    version: z.number(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_find_slo_response: z.ZodType<any> = z
  .object({
    page: z.number(),
    perPage: z.number(),
    results: z.array(SLOs_slo_with_summary_response),
    searchAfter: z.string(),
    size: z.number(),
    total: z.number(),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_400_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_401_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_403_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_404_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_create_slo_request: z.ZodType<any> = z
  .object({
    budgetingMethod: SLOs_budgeting_method,
    description: z.string(),
    groupBy: SLOs_group_by.optional(),
    id: z.string().optional(),
    indicator: z.union([
      SLOs_indicator_properties_custom_kql,
      SLOs_indicator_properties_apm_availability,
      SLOs_indicator_properties_apm_latency,
      SLOs_indicator_properties_custom_metric,
      SLOs_indicator_properties_histogram,
      SLOs_indicator_properties_timeslice_metric,
    ]),
    name: z.string(),
    objective: SLOs_objective,
    settings: SLOs_settings.optional(),
    tags: z.array(z.string()).optional(),
    timeWindow: SLOs_time_window,
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_create_slo_response = z.object({ id: z.string() }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_409_response = z
  .object({ error: z.string(), message: z.string(), statusCode: z.number() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_bulk_delete_request = z.object({ list: z.array(z.string()) }).passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_bulk_delete_response = z.object({ taskId: z.string() }).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_bulk_delete_status_response = z
  .object({
    error: z.string(),
    isDone: z.boolean(),
    results: z.array(
      z.object({ error: z.string(), id: z.string(), success: z.boolean() }).partial().passthrough()
    ),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_bulk_purge_rollup_request = z
  .object({
    list: z.array(z.string()),
    purgePolicy: z.union([
      z
        .object({ age: z.string(), purgeType: z.literal('fixed-age') })
        .partial()
        .passthrough(),
      z
        .object({ purgeType: z.literal('fixed-time'), timestamp: z.string() })
        .partial()
        .passthrough(),
    ]),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_bulk_purge_rollup_response = z
  .object({ taskId: z.string() })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_delete_slo_instances_request = z
  .object({ list: z.array(z.object({ instanceId: z.string(), sloId: z.string() }).passthrough()) })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_update_slo_request: z.ZodType<any> = z
  .object({
    budgetingMethod: SLOs_budgeting_method,
    description: z.string(),
    groupBy: SLOs_group_by,
    indicator: z.union([
      SLOs_indicator_properties_custom_kql,
      SLOs_indicator_properties_apm_availability,
      SLOs_indicator_properties_apm_latency,
      SLOs_indicator_properties_custom_metric,
      SLOs_indicator_properties_histogram,
      SLOs_indicator_properties_timeslice_metric,
    ]),
    name: z.string(),
    objective: SLOs_objective,
    settings: SLOs_settings,
    tags: z.array(z.string()),
    timeWindow: SLOs_time_window,
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_slo_definition_response: z.ZodType<any> = z
  .object({
    budgetingMethod: SLOs_budgeting_method,
    createdAt: z.string(),
    description: z.string(),
    enabled: z.boolean(),
    groupBy: SLOs_group_by,
    id: z.string(),
    indicator: z.union([
      SLOs_indicator_properties_custom_kql,
      SLOs_indicator_properties_apm_availability,
      SLOs_indicator_properties_apm_latency,
      SLOs_indicator_properties_custom_metric,
      SLOs_indicator_properties_histogram,
      SLOs_indicator_properties_timeslice_metric,
    ]),
    name: z.string(),
    objective: SLOs_objective,
    revision: z.number(),
    settings: SLOs_settings,
    tags: z.array(z.string()),
    timeWindow: SLOs_time_window,
    updatedAt: z.string(),
    version: z.number(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLOs_find_slo_definitions_response: z.ZodType<any> = z.union([
  z
    .object({
      page: z.number(),
      perPage: z.number(),
      results: z.array(SLOs_slo_with_summary_response),
      total: z.number(),
    })
    .partial()
    .passthrough(),
  z
    .object({
      page: z.number().default(1),
      perPage: z.number(),
      results: z.array(SLOs_slo_with_summary_response),
      searchAfter: z.array(z.string()),
      size: z.number(),
      total: z.number(),
    })
    .partial()
    .passthrough(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Observability_AI_Assistant_API_ChatCompleteRequestExample = z.unknown();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Observability_AI_Assistant_API_ChatCompleteResponseExample = z.unknown();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Saved_objects_attributes = z.object({}).partial().passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Saved_objects_initial_namespaces = z.array(z.any());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Saved_objects_references = z.array(z.any());
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_FindAnonymizationFieldsSortField = z.enum([
  'created_at',
  'anonymized',
  'allowed',
  'field',
  'updated_at',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_FindConversationsSortField = z.enum([
  'created_at',
  'title',
  'updated_at',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_FindKnowledgeBaseEntriesSortField = z.enum([
  'created_at',
  'is_default',
  'title',
  'updated_at',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_FindPromptsSortField = z.enum([
  'created_at',
  'is_default',
  'name',
  'updated_at',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_AI_Assistant_API_SortOrder = z.enum(['asc', 'desc']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertsIndexMigrationError = z
  .object({
    error: z.object({ message: z.string(), status_code: z.string() }).passthrough(),
    index: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertsIndexMigrationSuccess = z
  .object({ index: z.string(), migration_id: z.string(), migration_index: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertsReindexOptions = z
  .object({
    requests_per_second: z.number().int().gte(1),
    size: z.number().int().gte(1),
    slices: z.number().int().gte(1),
  })
  .partial()
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_AlertVersion = z
  .object({ count: z.number().int(), version: z.number().int() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_FindRulesSortField = z.enum([
  'created_at',
  'createdAt',
  'enabled',
  'execution_summary.last_execution.date',
  'execution_summary.last_execution.metrics.execution_gap_duration_s',
  'execution_summary.last_execution.metrics.total_indexing_duration_ms',
  'execution_summary.last_execution.metrics.total_search_duration_ms',
  'execution_summary.last_execution.status',
  'name',
  'risk_score',
  'riskScore',
  'severity',
  'updated_at',
  'updatedAt',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MigrationStatus = z
  .object({
    id: Security_Detections_API_NonEmptyString.min(1),
    status: z.enum(['success', 'failure', 'pending']),
    updated: z.string().datetime({ offset: true }),
    version: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_IndexMigrationStatus = z
  .object({
    index: Security_Detections_API_NonEmptyString.min(1),
    is_outdated: z.boolean(),
    migrations: z.array(Security_Detections_API_MigrationStatus),
    signal_versions: z.array(Security_Detections_API_AlertVersion),
    version: z.number().int(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MigrationCleanupResult = z
  .object({
    destinationIndex: z.string(),
    error: z
      .object({ message: z.string(), status_code: z.number().int() })
      .passthrough()
      .optional(),
    id: z.string(),
    sourceIndex: z.string(),
    status: z.enum(['success', 'failure', 'pending']),
    updated: z.string().datetime({ offset: true }),
    version: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_MigrationFinalizationResult = z
  .object({
    completed: z.boolean(),
    destinationIndex: z.string(),
    error: z
      .object({ message: z.string(), status_code: z.number().int() })
      .passthrough()
      .optional(),
    id: z.string(),
    sourceIndex: z.string(),
    status: z.enum(['success', 'failure', 'pending']),
    updated: z.string().datetime({ offset: true }),
    version: z.string(),
  })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SkippedAlertsIndexMigration = z
  .object({ index: z.string() })
  .passthrough();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Detections_API_SortOrder = z.enum(['asc', 'desc']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_EndpointListItem =
  Security_Endpoint_Exceptions_API_ExceptionListItem;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Exceptions_API_FindEndpointListItemsFilter =
  Security_Endpoint_Exceptions_API_NonEmptyString;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Commands = z.array(
  Security_Endpoint_Management_API_Command
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_EndDate = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_HostStatuses = z.array(
  z.enum(['healthy', 'offline', 'updating', 'inactive', 'unenrolled'])
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Kuery = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Page = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_PageSize = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_SortDirection = z.enum(['asc', 'desc']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_SortField = z.enum([
  'enrolled_at',
  'metadata.host.hostname',
  'host_status',
  'metadata.Endpoint.policy.applied.name',
  'metadata.Endpoint.policy.applied.status',
  'metadata.host.os.name',
  'metadata.host.ip',
  'metadata.agent.version',
  'last_checkin',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_StartDate = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_Types = z.array(
  Security_Endpoint_Management_API_Type
);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_UserIds = z.union([
  z.array(z.string().min(1)),
  z.string(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Endpoint_Management_API_WithOutputs = z.union([
  z.array(z.string().min(1)),
  z.string(),
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Entity_Analytics_API_Metadata =
  Security_Entity_Analytics_API_TransformStatsMetadata;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_FindExceptionListItemsFilter =
  Security_Exceptions_API_NonEmptyString;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_FindExceptionListsFilter = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_UUID = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Exceptions_API_RuleId = Security_Exceptions_API_UUID;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_FindListItemsFilter = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Lists_API_FindListsFilter = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_KueryOrUndefined = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PageOrUndefined = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_PageSizeOrUndefined = z.number();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_SortOrderOrUndefined = z.enum(['asc', 'desc']);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Osquery_API_SortOrUndefined = z.string();
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_AssociatedFilterType = z.enum([
  'all',
  'document_only',
  'saved_object_only',
  'document_and_saved_object',
  'orphan',
]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_DocumentIds = z.union([z.array(z.string()), z.string()]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_PersistTimelineResponse = Security_Timeline_API_TimelineResponse;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_SavedObjectIds = z.union([z.array(z.string()), z.string()]);
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Security_Timeline_API_SortFieldTimeline = z.enum([
  'title',
  'description',
  'updated',
  'created',
]);
