/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  ConnectorContractUnion,
  ConnectorTypeInfo,
  EnhancedInternalConnectorContract,
  InternalConnectorContract,
} from '@kbn/workflows';
import {
  enhanceKibanaConnectorsWithFetcher,
  generateYamlSchemaFromConnectors,
} from '@kbn/workflows';
import { z } from '@kbn/zod';

// Import connector schemas from the organized structure
import { mergeEnhancedConnectors } from './enhanced_es_connectors';
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

// Static connectors used for schema generation
const staticConnectors: ConnectorContractUnion[] = [
  {
    type: 'console',
    summary: 'Console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.string(),
    description: i18n.translate('workflows.connectors.console.description', {
      defaultMessage: 'Log a message to the workflow logs',
    }),
  },
  // Note: inference sub-actions are now generated dynamically
  // Generic request types for raw API calls
  {
    type: 'elasticsearch.request',
    summary: 'Elasticsearch Request',
    connectorIdRequired: false,
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      params: z.any().optional(),
      headers: z.any().optional(),
    }),
    outputSchema: z.any(),
    description: i18n.translate('workflows.connectors.elasticsearch.request.description', {
      defaultMessage: 'Make a generic request to an Elasticsearch API',
    }),
  },
  {
    type: 'kibana.request',
    summary: 'Kibana Request',
    connectorIdRequired: false,
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      headers: z.any().optional(),
    }),
    outputSchema: z.any(),
    description: i18n.translate('workflows.connectors.kibana.request.description', {
      defaultMessage: 'Make a generic request to a Kibana API',
    }),
  },
];

/**
 * Elasticsearch Connector Generation
 *
 * This system provides ConnectorContract[] for all Elasticsearch APIs
 * by using pre-generated definitions from Console's API specifications.
 *
 * Benefits:
 * 1. **Schema Validation**: Zod schemas for all ES API parameters
 * 2. **Autocomplete**: Monaco YAML editor gets full autocomplete via JSON Schema
 * 3. **Comprehensive Coverage**: 568 Elasticsearch APIs supported
 * 4. **Browser Compatible**: No file system access required
 * 5. **Lazy Loading**: Large generated files are only loaded when needed, reducing main bundle size
 *
 * The generated connectors include:
 * - All Console API definitions converted to Zod schemas
 * - Path parameters extracted from patterns (e.g., {index}, {id})
 * - URL parameters with proper types (flags, enums, strings, numbers)
 * - Proper ConnectorContract format for workflow execution
 *
 * To regenerate: run `npm run generate:es-connectors` from @kbn/workflows package
 */
function generateElasticsearchConnectors(): EnhancedInternalConnectorContract[] {
  // Lazy load the large generated files to keep them out of the main bundle
  const {
    GENERATED_ELASTICSEARCH_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@kbn/workflows/common/generated/elasticsearch_connectors');

  const {
    ENHANCED_ELASTICSEARCH_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('./enhanced_es_connectors');

  // Return enhanced connectors (merge generated with enhanced definitions)
  return mergeEnhancedConnectors(
    GENERATED_ELASTICSEARCH_CONNECTORS,
    ENHANCED_ELASTICSEARCH_CONNECTORS
  );
}

function generateKibanaConnectors(): InternalConnectorContract[] {
  // Lazy load the generated Kibana connectors
  const {
    GENERATED_KIBANA_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@kbn/workflows/common/generated/kibana_connectors');

  // Enhance connectors with fetcher parameter support
  return enhanceKibanaConnectorsWithFetcher(GENERATED_KIBANA_CONNECTORS);
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

// Global cache for all connectors (static + generated + dynamic)
let allConnectorsCache: ConnectorContractUnion[] | null = null;

let allConnectorsMapCache: Map<string, ConnectorContractUnion> | null = null;

// Global cache for dynamic connector types (with instances)
let dynamicConnectorTypesCache: Record<string, ConnectorTypeInfo> | null = null;

// Track the last processed connector types to avoid unnecessary re-processing
let lastProcessedConnectorTypesHash: string | null = null;

export function getCachedAllConnectorsMap(): Map<string, ConnectorContractUnion> | null {
  return allConnectorsMapCache;
}

export function setCachedAllConnectorsMap(allConnectors: ConnectorContractUnion[]) {
  allConnectorsMapCache = new Map(allConnectors.map((c) => [c.type, c]));
}

/**
 * Add dynamic connectors to the global cache
 * Call this when dynamic connector data is fetched from the API
 */
export function addDynamicConnectorsToCache(
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
) {
  // Create a simple hash of the connector types to detect changes
  const currentHash = JSON.stringify(Object.keys(dynamicConnectorTypes).sort());

  // Skip processing if the connector types haven't changed
  if (lastProcessedConnectorTypesHash === currentHash && dynamicConnectorTypesCache !== null) {
    return;
  }

  // Store the raw dynamic connector types for completion provider access
  dynamicConnectorTypesCache = dynamicConnectorTypes;
  lastProcessedConnectorTypesHash = currentHash;

  // Get base connectors if cache is empty
  if (allConnectorsCache === null) {
    const elasticsearchConnectors = generateElasticsearchConnectors();
    const kibanaConnectors = generateKibanaConnectors();
    allConnectorsCache = [...staticConnectors, ...elasticsearchConnectors, ...kibanaConnectors];
  }

  // Convert dynamic connectors to ConnectorContract format
  const dynamicConnectors = convertDynamicConnectorsToContracts(dynamicConnectorTypes);

  // Get existing connector types to avoid duplicates
  const existingTypes = new Set(allConnectorsCache.map((c) => c.type));

  // Add only new dynamic connectors
  const newDynamicConnectors = dynamicConnectors.filter((c) => !existingTypes.has(c.type));

  if (newDynamicConnectors.length > 0) {
    allConnectorsCache.push(...newDynamicConnectors);
  }

  setCachedAllConnectorsMap(allConnectorsCache);
}

/**
 * Get cached dynamic connector types (with instances)
 * Used by completion provider to access connector instances
 * TODO: This function is not used anywhere, we should clean it up
 * @deprecated use the store to get dynamic connectors
 */
export function getCachedDynamicConnectorTypes(): Record<string, ConnectorTypeInfo> | null {
  return dynamicConnectorTypesCache;
}

// Combine static connectors with dynamic Elasticsearch and Kibana connectors
export function getAllConnectors(): ConnectorContractUnion[] {
  // Return cached connectors if available
  if (allConnectorsCache !== null) {
    return allConnectorsCache;
  }

  // Initialize cache with static and generated connectors
  const elasticsearchConnectors = generateElasticsearchConnectors();
  const kibanaConnectors = generateKibanaConnectors();
  allConnectorsCache = [...staticConnectors, ...elasticsearchConnectors, ...kibanaConnectors];
  setCachedAllConnectorsMap(allConnectorsCache);

  return allConnectorsCache;
}

export const getOutputSchemaForStepType = (stepType: string) => {
  const allConnectors = getAllConnectors();
  const connector = allConnectors.find((c) => c.type === stepType);
  if (connector) {
    return connector.outputSchema;
  }

  // Handle internal actions with pattern matching
  // TODO: add output schema support for elasticsearch.request and kibana.request connectors
  if (stepType.startsWith('elasticsearch.')) {
    return z.any();
  }

  if (stepType.startsWith('kibana.')) {
    return z.any();
  }

  // Fallback to any if not found
  return z.any();
};

/**
 * Get all connectors including dynamic ones from actions client
 */
export function getAllConnectorsWithDynamic(
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  const staticAndGeneratedConnectors = getAllConnectors();

  // Graceful fallback if dynamic connectors are not available
  if (!dynamicConnectorTypes || Object.keys(dynamicConnectorTypes).length === 0) {
    // console.debug('Dynamic connectors not available, using static connectors only');
    return staticAndGeneratedConnectors;
  }

  try {
    const dynamicConnectors = convertDynamicConnectorsToContracts(dynamicConnectorTypes);

    // Filter out any duplicates (dynamic connectors override static ones with same type)
    const staticConnectorTypes = new Set(staticAndGeneratedConnectors.map((c) => c.type));
    const uniqueDynamicConnectors = dynamicConnectors.filter(
      (c) => !staticConnectorTypes.has(c.type)
    );

    // Connectors added successfully without logging noise
    return [...staticAndGeneratedConnectors, ...uniqueDynamicConnectors];
  } catch (error) {
    // console.error('Error processing dynamic connectors, falling back to static connectors:', error);
    return staticAndGeneratedConnectors;
  }
}

// Dynamic schemas that include all connectors (static + Elasticsearch + dynamic)
// These use lazy loading to keep large generated files out of the main bundle
export const getWorkflowZodSchema = (dynamicConnectorTypes: Record<string, ConnectorTypeInfo>) => {
  const allConnectors = getAllConnectorsWithDynamic(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors);
};
export type WorkflowZodSchemaType = z.infer<ReturnType<typeof getWorkflowZodSchema>>;

export const getWorkflowZodSchemaLoose = (
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
) => {
  const allConnectors = getAllConnectorsWithDynamic(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors, true);
};
export type WorkflowZodSchemaLooseType = z.infer<ReturnType<typeof getWorkflowZodSchemaLoose>>;

// Legacy exports for backward compatibility - these will be deprecated
// TODO: Remove these once all consumers are updated to use the lazy-loaded versions
export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(staticConnectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(staticConnectors, true);

// Partially recreated from x-pack/platform/plugins/shared/alerting/server/connector_adapters/types.ts
// TODO: replace with dynamic schema
