/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Import SUB_ACTION enums from all stack connectors
import {
  BEDROCK_CONNECTOR_ID,
  SUB_ACTION as BEDROCK_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/bedrock/constants';
import {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION as CROWDSTRIKE_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import {
  D3_SECURITY_CONNECTOR_ID,
  SUB_ACTION as D3SECURITY_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/d3security/constants';
import {
  GEMINI_CONNECTOR_ID,
  SUB_ACTION as GEMINI_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/gemini/constants';
import {
  INFERENCE_CONNECTOR_ID,
  SUB_ACTION as INFERENCE_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/inference/constants';
import {
  JIRA_SERVICE_MANAGEMENT_CONNECTOR_TYPE_ID,
  JiraServiceManagementSubActions,
} from '@kbn/stack-connectors-plugin/common/jira-service-management/constants';
import {
  MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/constants';
import {
  OPENAI_CONNECTOR_ID,
  SUB_ACTION as OPENAI_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/openai/constants';
import {
  OpsgenieConnectorTypeId,
  OpsgenieSubActions,
} from '@kbn/stack-connectors-plugin/common/opsgenie';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION as SENTINELONE_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import {
  THEHIVE_CONNECTOR_ID,
  SUB_ACTION as THEHIVE_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/thehive/constants';
import {
  TINES_CONNECTOR_ID,
  SUB_ACTION as TINES_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/tines/constants';
import {
  XSOAR_CONNECTOR_ID,
  SUB_ACTION as XSOAR_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/xsoar/constants';

// Helper function to format sub-action names for display
function formatSubActionName(action: string): string {
  // Handle both snake_case and camelCase
  return (
    action
      // First, split camelCase: insertCamelCaseSpaces
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Then split on underscores and other separators
      .split(/[_\s-]+/)
      // Capitalize each word
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  );
}

// Helper function to create sub-actions mapping
function createSubActionsMapping() {
  const mapping: Record<string, Array<{ name: string; displayName: string }>> = {};

  // Define legacy connector sub-actions (connectors using older ActionType pattern)
  const JIRA_SUB_ACTIONS = {
    GET_FIELDS: 'getFields',
    GET_INCIDENT: 'getIncident',
    PUSH_TO_SERVICE: 'pushToService',
    ISSUE_TYPES: 'issueTypes',
    FIELDS_BY_ISSUE_TYPE: 'fieldsByIssueType',
    ISSUES: 'issues',
    ISSUE: 'issue',
  };

  const SERVICENOW_ITSM_SUB_ACTIONS = {
    GET_FIELDS: 'getFields',
    PUSH_TO_SERVICE: 'pushToService',
    GET_CHOICES: 'getChoices',
    GET_INCIDENT: 'getIncident',
    CLOSE_INCIDENT: 'closeIncident',
  };

  const SERVICENOW_SIR_SUB_ACTIONS = {
    GET_FIELDS: 'getFields',
    PUSH_TO_SERVICE: 'pushToService',
    GET_CHOICES: 'getChoices',
    GET_INCIDENT: 'getIncident',
  };

  const SERVICENOW_ITOM_SUB_ACTIONS = {
    ADD_EVENT: 'addEvent',
    GET_CHOICES: 'getChoices',
  };

  const SWIMLANE_SUB_ACTIONS = {
    PUSH_TO_SERVICE: 'pushToService',
  };

  const CASES_WEBHOOK_SUB_ACTIONS = {
    PUSH_TO_SERVICE: 'pushToService',
  };

  // Define all connector sub-actions
  const connectorSubActions = [
    { id: INFERENCE_CONNECTOR_ID, actions: INFERENCE_SUB_ACTION },
    { id: BEDROCK_CONNECTOR_ID, actions: BEDROCK_SUB_ACTION },
    { id: OPENAI_CONNECTOR_ID, actions: OPENAI_SUB_ACTION },
    { id: GEMINI_CONNECTOR_ID, actions: GEMINI_SUB_ACTION },
    { id: THEHIVE_CONNECTOR_ID, actions: THEHIVE_SUB_ACTION },
    { id: TINES_CONNECTOR_ID, actions: TINES_SUB_ACTION },
    { id: XSOAR_CONNECTOR_ID, actions: XSOAR_SUB_ACTION },
    { id: SENTINELONE_CONNECTOR_ID, actions: SENTINELONE_SUB_ACTION },
    { id: D3_SECURITY_CONNECTOR_ID, actions: D3SECURITY_SUB_ACTION },
    { id: CROWDSTRIKE_CONNECTOR_ID, actions: CROWDSTRIKE_SUB_ACTION },
    {
      id: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
      actions: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
    },
    { id: JIRA_SERVICE_MANAGEMENT_CONNECTOR_TYPE_ID, actions: JiraServiceManagementSubActions },
    { id: OpsgenieConnectorTypeId, actions: OpsgenieSubActions },
    // Legacy connectors (using older ActionType pattern)
    { id: '.jira', actions: JIRA_SUB_ACTIONS },
    { id: '.servicenow-itsm', actions: SERVICENOW_ITSM_SUB_ACTIONS },
    { id: '.servicenow-sir', actions: SERVICENOW_SIR_SUB_ACTIONS },
    { id: '.servicenow-itom', actions: SERVICENOW_ITOM_SUB_ACTIONS },
    { id: '.swimlane', actions: SWIMLANE_SUB_ACTIONS },
    { id: '.cases-webhook', actions: CASES_WEBHOOK_SUB_ACTIONS },
  ];

  connectorSubActions.forEach(({ id, actions }) => {
    mapping[id] = Object.values(actions).map((action) => ({
      name: action,
      displayName: formatSubActionName(action),
    }));
  });

  return mapping;
}

// Create the sub-actions mapping
export const CONNECTOR_SUB_ACTIONS_MAP = createSubActionsMapping();
