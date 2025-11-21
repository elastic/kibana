/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion, ConnectorTypeInfo } from '@kbn/workflows';
import { z } from '@kbn/zod';
// Import connector schemas from the organized structure
/* eslint-disable sort-imports */
import {
  // Inference connector schemas
  InferenceUnifiedCompletionParamsSchema,
  InferenceCompletionParamsSchema,
  InferenceRerankParamsSchema,
  InferenceTextEmbeddingParamsSchema,
  InferenceSparseEmbeddingParamsSchema,
  InferenceUnifiedCompletionResponseSchema,
  InferenceCompletionResponseSchema,
  InferenceRerankResponseSchema,
  InferenceTextEmbeddingResponseSchema,
  InferenceSparseEmbeddingResponseSchema,
  SlackParamsSchema,
  SlackResponseSchema,
  EmailParamsSchema,
  EmailResponseSchema,
  WebhookParamsSchema,
  WebhookResponseSchema,
  JiraPushToServiceParamsSchema,
  JiraGetIncidentParamsSchema,
  JiraGetFieldsParamsSchema,
  JiraGetIssueTypesParamsSchema,
  JiraGetFieldsByIssueTypeParamsSchema,
  JiraGetIssuesParamsSchema,
  JiraGetIssueParamsSchema,
  JiraIssueResponseSchema,
  JiraPushToServiceResponseSchema,
  JiraFieldsResponseSchema,
  JiraIssueTypesResponseSchema,
  JiraIssuesResponseSchema,
  ServiceNowCreateIncidentParamsSchema,
  ServiceNowUpdateIncidentParamsSchema,
  ServiceNowGetIncidentParamsSchema,
  ServiceNowGetFieldsParamsSchema,
  ServiceNowGetChoicesParamsSchema,
  ServiceNowCloseIncidentParamsSchema,
  ServiceNowAddEventParamsSchema,
  ServiceNowCreateSecurityIncidentParamsSchema,
  ServiceNowIncidentResponseSchema,
  ServiceNowFieldsResponseSchema,
  ServiceNowChoicesResponseSchema,
  ServiceNowEventResponseSchema,
  PagerDutyParamsSchema,
  PagerDutyResponseSchema,
  TeamsParamsSchema,
  TeamsResponseSchema,
  BedrockParamsSchema,
  BedrockResponseSchema,
  OpenAIParamsSchema,
  OpenAIResponseSchema,
  GeminiParamsSchema,
  GeminiResponseSchema,
  EsIndexParamsSchema,
  EsIndexResponseSchema,
  ServerLogParamsSchema,
  ServerLogResponseSchema,
  OpsgenieCreateAlertParamsSchema,
  OpsgenieCloseAlertParamsSchema,
  OpsgenieResponseSchema,
  ResilientCreateIncidentParamsSchema,
  ResilientUpdateIncidentParamsSchema,
  ResilientAddCommentParamsSchema,
  ResilientIncidentResponseSchema,
  SwimlaneCreateRecordParamsSchema,
  SwimlaneResponseSchema,
  CasesWebhookCreateCaseParamsSchema,
  CasesWebhookResponseSchema,
  SlackApiPostMessageParamsSchema,
  SlackApiGetChannelsParamsSchema,
  SlackApiGetUsersParamsSchema,
  SlackApiResponseSchema,
  // Tines connector schemas
  TinesStoriesParamsSchema,
  TinesWebhooksParamsSchema,
  TinesRunParamsSchema,
  TinesTestParamsSchema,
  TinesResponseSchema,
  // Jira Service Management connector schemas
  JiraServiceManagementCreateAlertParamsSchema,
  JiraServiceManagementCloseAlertParamsSchema,
  JiraServiceManagementResponseSchema,
  // TheHive connector schemas
  TheHivePushToServiceParamsSchema,
  TheHiveCreateAlertParamsSchema,
  TheHiveGetIncidentParamsSchema,
  TheHiveIncidentResponseSchema,
  TheHiveCreateAlertResponseSchema,
  // D3 Security connector schemas
  D3SecurityRunParamsSchema,
  D3SecurityTestParamsSchema,
  D3SecurityResponseSchema,
  // Gen AI connector schemas
  GenAIRunParamsSchema,
  GenAIInvokeAIParamsSchema,
  GenAIStreamParamsSchema,
  GenAIDashboardParamsSchema,
  GenAITestParamsSchema,
  GenAIRunResponseSchema,
  GenAIInvokeAIResponseSchema,
  GenAIStreamResponseSchema,
  GenAIDashboardResponseSchema,
  GenAITestResponseSchema,
  // Torq connector schemas
  TorqParamsSchema,
  TorqResponseSchema,
} from './stack_connectors_schema';

/**
 * Get parameter schema for a specific sub-action
 */
// eslint-disable-next-line complexity
function getSubActionParamsSchema(actionTypeId: string, subActionName: string): z.ZodSchema {
  // Handle inference connector sub-actions
  if (actionTypeId === '.inference') {
    switch (subActionName) {
      case 'unified_completion':
      case 'unified_completion_stream':
      case 'unified_completion_async_iterator':
        return InferenceUnifiedCompletionParamsSchema;
      case 'completion':
        return InferenceCompletionParamsSchema;
      case 'rerank':
        return InferenceRerankParamsSchema;
      case 'text_embedding':
        return InferenceTextEmbeddingParamsSchema;
      case 'sparse_embedding':
        return InferenceSparseEmbeddingParamsSchema;
    }
  }

  // Handle other connector types (both with and without sub-actions)
  // For connectors without sub-actions, subActionName will be empty string
  switch (actionTypeId) {
    case '.slack':
      return SlackParamsSchema;
    case '.email':
      return EmailParamsSchema;
    case '.webhook':
      return WebhookParamsSchema;
    case '.teams':
      return TeamsParamsSchema;
    case '.bedrock':
      return BedrockParamsSchema;
    case '.openai':
      return OpenAIParamsSchema;
    case '.gemini':
      return GeminiParamsSchema;
    case '.index':
      return EsIndexParamsSchema;
    case '.server-log':
      return ServerLogParamsSchema;
    case '.pagerduty':
      return PagerDutyParamsSchema;
    case '.torq':
      return TorqParamsSchema;
  }

  // Handle Jira sub-actions
  if (actionTypeId === '.jira') {
    switch (subActionName) {
      case 'pushToService':
        return JiraPushToServiceParamsSchema;
      case 'getIncident':
        return JiraGetIncidentParamsSchema;
      case 'getFields':
        return JiraGetFieldsParamsSchema;
      case 'issueTypes':
        return JiraGetIssueTypesParamsSchema;
      case 'fieldsByIssueType':
        return JiraGetFieldsByIssueTypeParamsSchema;
      case 'issues':
        return JiraGetIssuesParamsSchema;
      case 'issue':
        return JiraGetIssueParamsSchema;
    }
  }

  // Handle ServiceNow ITSM sub-actions
  if (actionTypeId === '.servicenow-itsm') {
    switch (subActionName) {
      case 'pushToService':
        return ServiceNowCreateIncidentParamsSchema;
      case 'updateIncident':
        return ServiceNowUpdateIncidentParamsSchema;
      case 'getIncident':
        return ServiceNowGetIncidentParamsSchema;
      case 'getFields':
        return ServiceNowGetFieldsParamsSchema;
      case 'getChoices':
        return ServiceNowGetChoicesParamsSchema;
      case 'closeIncident':
        return ServiceNowCloseIncidentParamsSchema;
    }
  }

  // Handle ServiceNow SIR sub-actions
  if (actionTypeId === '.servicenow-sir') {
    switch (subActionName) {
      case 'pushToService':
        return ServiceNowCreateSecurityIncidentParamsSchema;
      case 'getIncident':
        return ServiceNowGetIncidentParamsSchema;
      case 'getFields':
        return ServiceNowGetFieldsParamsSchema;
      case 'getChoices':
        return ServiceNowGetChoicesParamsSchema;
    }
  }

  // Handle ServiceNow ITOM sub-actions
  if (actionTypeId === '.servicenow-itom') {
    switch (subActionName) {
      case 'addEvent':
        return ServiceNowAddEventParamsSchema;
      case 'getChoices':
        return ServiceNowGetChoicesParamsSchema;
    }
  }

  // Handle Opsgenie sub-actions
  if (actionTypeId === '.opsgenie') {
    switch (subActionName) {
      case 'createAlert':
        return OpsgenieCreateAlertParamsSchema;
      case 'closeAlert':
        return OpsgenieCloseAlertParamsSchema;
    }
  }

  // Handle Resilient sub-actions
  if (actionTypeId === '.resilient') {
    switch (subActionName) {
      case 'pushToService':
        return ResilientCreateIncidentParamsSchema;
      case 'updateIncident':
        return ResilientUpdateIncidentParamsSchema;
      case 'addComment':
        return ResilientAddCommentParamsSchema;
    }
  }

  // Handle Swimlane sub-actions
  if (actionTypeId === '.swimlane') {
    switch (subActionName) {
      case 'pushToService':
        return SwimlaneCreateRecordParamsSchema;
    }
  }

  // Handle Cases Webhook sub-actions
  if (actionTypeId === '.cases-webhook') {
    switch (subActionName) {
      case 'pushToService':
        return CasesWebhookCreateCaseParamsSchema;
    }
  }

  // Handle Slack API sub-actions
  if (actionTypeId === '.slack_api') {
    switch (subActionName) {
      case 'postMessage':
        return SlackApiPostMessageParamsSchema;
      case 'getChannels':
        return SlackApiGetChannelsParamsSchema;
      case 'getUsers':
        return SlackApiGetUsersParamsSchema;
    }
  }

  // Handle Tines sub-actions
  if (actionTypeId === '.tines') {
    switch (subActionName) {
      case 'stories':
        return TinesStoriesParamsSchema;
      case 'webhooks':
        return TinesWebhooksParamsSchema;
      case 'run':
        return TinesRunParamsSchema;
      case 'test':
        return TinesTestParamsSchema;
    }
  }

  // Handle Jira Service Management sub-actions
  if (actionTypeId === '.jira-service-management') {
    switch (subActionName) {
      case 'createAlert':
        return JiraServiceManagementCreateAlertParamsSchema;
      case 'closeAlert':
        return JiraServiceManagementCloseAlertParamsSchema;
    }
  }

  // Handle TheHive sub-actions
  if (actionTypeId === '.thehive') {
    switch (subActionName) {
      case 'pushToService':
        return TheHivePushToServiceParamsSchema;
      case 'createAlert':
        return TheHiveCreateAlertParamsSchema;
      case 'getIncident':
        return TheHiveGetIncidentParamsSchema;
    }
  }

  // Handle D3 Security sub-actions
  if (actionTypeId === '.d3security') {
    switch (subActionName) {
      case 'run':
        return D3SecurityRunParamsSchema;
      case 'test':
        return D3SecurityTestParamsSchema;
    }
  }

  // Handle Gen AI sub-actions
  if (actionTypeId === '.gen-ai') {
    switch (subActionName) {
      case 'run':
        return GenAIRunParamsSchema;
      case 'invokeAI':
        return GenAIInvokeAIParamsSchema;
      case 'invokeStream':
      case 'invokeAsyncIterator':
      case 'stream':
        return GenAIStreamParamsSchema;
      case 'getDashboard':
        return GenAIDashboardParamsSchema;
      case 'test':
        return GenAITestParamsSchema;
    }
  }

  // Generic fallback for unknown sub-actions
  return z
    .object({
      subAction: z.literal(subActionName),
      subActionParams: z.any(),
    })
    .required();
}

/**
 * Get output schema for a specific sub-action
 */
// eslint-disable-next-line complexity
function getSubActionOutputSchema(actionTypeId: string, subActionName: string): z.ZodSchema {
  // Handle inference connector sub-actions
  if (actionTypeId === '.inference') {
    switch (subActionName) {
      case 'unified_completion':
      case 'unified_completion_stream':
      case 'unified_completion_async_iterator':
        return InferenceUnifiedCompletionResponseSchema;
      case 'completion':
        return InferenceCompletionResponseSchema;
      case 'rerank':
        return InferenceRerankResponseSchema;
      case 'text_embedding':
        return InferenceTextEmbeddingResponseSchema;
      case 'sparse_embedding':
        return InferenceSparseEmbeddingResponseSchema;
    }
  }

  // Handle other connector types (both with and without sub-actions)
  // For connectors without sub-actions, subActionName will be empty string
  switch (actionTypeId) {
    case '.slack':
      return SlackResponseSchema;
    case '.email':
      return EmailResponseSchema;
    case '.webhook':
      return WebhookResponseSchema;
    case '.teams':
      return TeamsResponseSchema;
    case '.bedrock':
      return BedrockResponseSchema;
    case '.openai':
      return OpenAIResponseSchema;
    case '.gemini':
      return GeminiResponseSchema;
    case '.index':
      return EsIndexResponseSchema;
    case '.server-log':
      return ServerLogResponseSchema;
    case '.pagerduty':
      return PagerDutyResponseSchema;
    case '.torq':
      return TorqResponseSchema;
  }

  // Handle Jira sub-actions
  if (actionTypeId === '.jira') {
    switch (subActionName) {
      case 'pushToService':
        return JiraPushToServiceResponseSchema;
      case 'getIncident':
      case 'issue':
        return JiraIssueResponseSchema;
      case 'getFields':
        return JiraFieldsResponseSchema;
      case 'issueTypes':
        return JiraIssueTypesResponseSchema;
      case 'fieldsByIssueType':
        return JiraFieldsResponseSchema; // Same as getFields
      case 'issues':
        return JiraIssuesResponseSchema;
    }
  }

  // Handle ServiceNow ITSM sub-actions
  if (actionTypeId === '.servicenow-itsm') {
    switch (subActionName) {
      case 'pushToService':
      case 'updateIncident':
      case 'getIncident':
      case 'closeIncident':
        return ServiceNowIncidentResponseSchema;
      case 'getFields':
        return ServiceNowFieldsResponseSchema;
      case 'getChoices':
        return ServiceNowChoicesResponseSchema;
    }
  }

  // Handle ServiceNow SIR sub-actions
  if (actionTypeId === '.servicenow-sir') {
    switch (subActionName) {
      case 'pushToService':
      case 'getIncident':
        return ServiceNowIncidentResponseSchema;
      case 'getFields':
        return ServiceNowFieldsResponseSchema;
      case 'getChoices':
        return ServiceNowChoicesResponseSchema;
    }
  }

  // Handle ServiceNow ITOM sub-actions
  if (actionTypeId === '.servicenow-itom') {
    switch (subActionName) {
      case 'addEvent':
        return ServiceNowEventResponseSchema;
      case 'getChoices':
        return ServiceNowChoicesResponseSchema;
    }
  }

  // Handle Opsgenie sub-actions
  if (actionTypeId === '.opsgenie') {
    return OpsgenieResponseSchema;
  }

  // Handle Resilient sub-actions
  if (actionTypeId === '.resilient') {
    return ResilientIncidentResponseSchema;
  }

  // Handle Swimlane sub-actions
  if (actionTypeId === '.swimlane') {
    return SwimlaneResponseSchema;
  }

  // Handle Cases Webhook sub-actions
  if (actionTypeId === '.cases-webhook') {
    return CasesWebhookResponseSchema;
  }

  // Handle Slack API sub-actions
  if (actionTypeId === '.slack_api') {
    return SlackApiResponseSchema;
  }

  // Handle Tines sub-actions
  if (actionTypeId === '.tines') {
    return TinesResponseSchema;
  }

  // Handle Jira Service Management sub-actions
  if (actionTypeId === '.jira-service-management') {
    return JiraServiceManagementResponseSchema;
  }

  // Handle TheHive sub-actions
  if (actionTypeId === '.thehive') {
    switch (subActionName) {
      case 'pushToService':
      case 'getIncident':
        return TheHiveIncidentResponseSchema;
      case 'createAlert':
        return TheHiveCreateAlertResponseSchema;
    }
  }

  // Handle D3 Security sub-actions
  if (actionTypeId === '.d3security') {
    return D3SecurityResponseSchema;
  }

  // Handle Gen AI sub-actions
  if (actionTypeId === '.gen-ai') {
    switch (subActionName) {
      case 'run':
        return GenAIRunResponseSchema;
      case 'invokeAI':
        return GenAIInvokeAIResponseSchema;
      case 'invokeStream':
      case 'invokeAsyncIterator':
      case 'stream':
        return GenAIStreamResponseSchema;
      case 'getDashboard':
        return GenAIDashboardResponseSchema;
      case 'test':
        return GenAITestResponseSchema;
    }
  }

  // Generic fallback
  return z.any();
}

/**
 * Convert dynamic connector data from actions client to ConnectorContract format
 */
export function convertDynamicConnectorsToContracts(
  connectorTypes: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  const connectorContracts: ConnectorContractUnion[] = [];

  Object.values(connectorTypes).forEach((connectorType) => {
    try {
      // Create connector ID schema with available instances
      // If no instances exist, use a generic string schema
      const connectorIdSchema =
        connectorType.instances.length > 0
          ? z.enum([
              connectorType.instances[0].id,
              ...connectorType.instances.slice(1).map((i) => i.id),
            ] as [string, ...string[]])
          : z.string();

      const connectorTypeName = connectorType.actionTypeId.replace(/^\./, '');
      // If the connector has sub-actions, create separate contracts for each sub-action
      if (connectorType.subActions && connectorType.subActions.length > 0) {
        connectorType.subActions.forEach((subAction) => {
          // Create type name: actionTypeId.subActionName (e.g., "inference.completion")
          const subActionType = `${connectorTypeName}.${subAction.name}`;

          connectorContracts.push({
            type: subActionType,
            summary: subAction.displayName,
            paramsSchema: getSubActionParamsSchema(connectorType.actionTypeId, subAction.name),
            connectorIdRequired: true,
            connectorId: connectorIdSchema,
            outputSchema: getSubActionOutputSchema(connectorType.actionTypeId, subAction.name),
            description: `${connectorType.displayName} - ${subAction.displayName}`,
            instances: connectorType.instances,
          });
        });
      } else {
        // Fallback: create a generic connector contract if no sub-actions
        // Try to get the proper schema for this connector type
        const paramsSchema = getSubActionParamsSchema(connectorType.actionTypeId, '');
        const outputSchema = getSubActionOutputSchema(connectorType.actionTypeId, '');

        connectorContracts.push({
          type: connectorTypeName,
          summary: connectorType.displayName,
          paramsSchema,
          connectorIdRequired: true,
          connectorId: connectorIdSchema,
          outputSchema,
          description: `${connectorType.displayName} connector`,
          instances: connectorType.instances,
        });
      }
    } catch (error) {
      // console.warn(`Error processing connector type ${connectorType.actionTypeId}:`, error);
      // Return a basic connector contract as fallback
      connectorContracts.push({
        type: connectorType.actionTypeId,
        summary: connectorType.displayName,
        paramsSchema: z.any(),
        connectorIdRequired: true,
        connectorId: z.string(),
        outputSchema: z.any(),
        description: `${connectorType.displayName || connectorType.actionTypeId} connector`,
      });
    }
  });

  return connectorContracts;
}
