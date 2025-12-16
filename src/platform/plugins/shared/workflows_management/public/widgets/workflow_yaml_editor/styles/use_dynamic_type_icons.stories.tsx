/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { GlobalWorkflowEditorStyles } from './global_workflow_editor_styles';
import { predefinedStepTypes, useDynamicTypeIcons } from './use_dynamic_type_icons';
import type { ConnectorsResponse } from '../../../entities/connectors/model/types';

export default {
  title: 'Use Dynamic Type Icons',
};

type MockConnectorTypeInfo = Pick<ConnectorTypeInfo, 'actionTypeId' | 'displayName'>;

interface MockConnectorsResponse {
  connectorTypes: {
    [key: string]: MockConnectorTypeInfo;
  };
}

const mockConnectorsResponse: MockConnectorsResponse = {
  connectorTypes: {
    slack: {
      actionTypeId: '.slack',
      displayName: 'Slack',
    },
    genAi: {
      actionTypeId: '.gen-ai',
      displayName: 'Gen AI',
    },
    bedrock: {
      actionTypeId: '.bedrock',
      displayName: 'Bedrock',
    },
    gemini: {
      actionTypeId: '.gemini',
      displayName: 'Gemini',
    },
    serviceNow: {
      actionTypeId: '.servicenow',
      displayName: 'Service Now',
    },
    serviceNowSir: {
      actionTypeId: '.servicenow-sir',
      displayName: 'Service Now SecOps',
    },
    serviceNowItom: {
      actionTypeId: '.servicenow-itom',
      displayName: 'Service Now ITOM',
    },
    jira: {
      actionTypeId: '.jira',
      displayName: 'Jira',
    },
    teams: {
      actionTypeId: '.teams',
      displayName: 'Teams',
    },
    torq: {
      actionTypeId: '.torq',
      displayName: 'Torq',
    },
    opsgenie: {
      actionTypeId: '.opsgenie',
      displayName: 'Opsgenie',
    },
    jiraServiceManagement: {
      actionTypeId: '.jira-service-management',
      displayName: 'Jira Service Management',
    },
    tines: {
      actionTypeId: '.tines',
      displayName: 'Tines',
    },
    xmatters: {
      actionTypeId: '.xmatters',
      displayName: 'Xmatters',
    },
    swimlane: {
      actionTypeId: '.swimlane',
      displayName: 'Swimlane',
    },
    email: {
      actionTypeId: '.email',
      displayName: 'Email',
    },
  },
};

const allTypes = [
  ...predefinedStepTypes,
  ...Object.values(mockConnectorsResponse.connectorTypes).map((connector) => ({
    actionTypeId: connector.actionTypeId.slice(1),
    displayName: connector.displayName,
  })),
];

export const Default = () => {
  useDynamicTypeIcons(mockConnectorsResponse as ConnectorsResponse);
  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
      <GlobalWorkflowEditorStyles />
      {allTypes.map((connector) => (
        <div
          key={connector.actionTypeId}
          className={`type-inline-highlight type-${connector.actionTypeId}`}
        >
          {connector.displayName}
        </div>
      ))}
    </EuiFlexGroup>
  );
};
