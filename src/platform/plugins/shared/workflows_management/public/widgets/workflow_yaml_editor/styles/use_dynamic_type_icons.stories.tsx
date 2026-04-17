/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText } from '@elastic/eui';
import type { Decorator } from '@storybook/react';
import React from 'react';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { CoreStart } from '@kbn/core/public';
import { CommonGlobalAppStyles } from '@kbn/core-chrome-layout/layouts/common/global_app_styles';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { GlobalWorkflowEditorStyles } from './global_workflow_editor_styles';
import { predefinedStepTypes, useDynamicTypeIcons } from './use_dynamic_type_icons';
import type { ConnectorsResponse } from '../../../entities/connectors/model/types';
import { mockUiSettingsService } from '../../../shared/mocks/mock_ui_settings_service';
import { HardcodedIcons } from '../../../shared/ui/step_icons/hardcoded_icons';

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
    inference: {
      actionTypeId: '.inference',
      displayName: 'Inference',
    },
    slackApi: {
      actionTypeId: '.slack_api',
      displayName: 'Slack API',
    },
  },
};

// Real connector logos (gemini, bedrock, jira, etc.) are lazy React components registered by
// stack_connectors. We use a placeholder iconClass here to avoid cross-plugin dependencies.
// Connectors with HardcodedIcons entries (slack, email, inference) still show the correct icon.
const createPopulatedActionTypeRegistry = () => {
  const registry = new TypeRegistry<ActionTypeModel>();
  for (const connector of Object.values(mockConnectorsResponse.connectorTypes)) {
    registry.register({
      id: connector.actionTypeId,
      iconClass: 'plugs',
      selectMessage: '',
      actionConnectorFields: null,
      actionParamsFields: null as unknown as ActionTypeModel['actionParamsFields'],
      validateParams: async () => ({ errors: {} }),
    } as unknown as ActionTypeModel);
  }
  return registry;
};

const decorator: Decorator = (story: Function) => {
  return (
    <I18nProvider>
      <KibanaContextProvider
        services={
          {
            application: {
              capabilities: { workflowsManagement: {} },
              getUrlForApp: () => '',
            },
            settings: { client: mockUiSettingsService() },
            storage: {
              storage: {},
              set: () => {},
              remove: () => {},
              clear: () => {},
              get: () => {},
            },
            triggersActionsUi: {
              actionTypeRegistry: createPopulatedActionTypeRegistry(),
              ruleTypeRegistry: new TypeRegistry(),
            },
            workflowsExtensions: {
              getStepDefinition: () => undefined,
              getAllStepDefinitions: () => [],
            },
          } as unknown as CoreStart
        }
      >
        <CommonGlobalAppStyles />
        {story()}
      </KibanaContextProvider>
    </I18nProvider>
  );
};

export default {
  title: 'Use Dynamic Type Icons',
  decorators: [decorator],
};

const allTypes = [
  ...predefinedStepTypes,
  ...Object.values(mockConnectorsResponse.connectorTypes).map((connector) => ({
    actionTypeId: connector.actionTypeId.slice(1),
    displayName: connector.displayName,
  })),
];

const hasHardcodedIcon = (actionTypeId: string): boolean =>
  actionTypeId in HardcodedIcons ||
  `.${actionTypeId}` in HardcodedIcons ||
  actionTypeId === 'elasticsearch' ||
  actionTypeId === 'kibana';

const withHardcodedIcons = allTypes.filter((t) => hasHardcodedIcon(t.actionTypeId));
const withFallbackIcons = allTypes.filter((t) => !hasHardcodedIcon(t.actionTypeId));

const SectionHeading = ({ children, first }: { children: string; first?: boolean }) => (
  <EuiText size="xs" color="subdued" style={{ margin: first ? '0 0 4px' : '16px 0 4px' }}>
    <strong>{children}</strong>
  </EuiText>
);

const DynamicTypeIconsDemo = () => {
  useDynamicTypeIcons(mockConnectorsResponse as ConnectorsResponse);
  return (
    <div className="monaco-editor" style={{ fontFamily: 'monospace', fontSize: 13 }}>
      <GlobalWorkflowEditorStyles />
      <div
        className="view-line"
        style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}
      >
        <SectionHeading first>{'Hardcoded icons (bundled SVGs)'}</SectionHeading>
        {withHardcodedIcons.map((t) => (
          <span
            key={t.actionTypeId}
            className={`type-inline-highlight type-${t.actionTypeId.replaceAll('.', '-')}`}
          >
            {t.actionTypeId}
          </span>
        ))}
        <SectionHeading>
          {'Connector icons (lazy-loaded from stack_connectors in full Kibana)'}
        </SectionHeading>
        {withFallbackIcons.map((t) => (
          <span
            key={t.actionTypeId}
            className={`type-inline-highlight type-${t.actionTypeId.replaceAll('.', '-')}`}
          >
            {t.actionTypeId}
          </span>
        ))}
      </div>
    </div>
  );
};

export const Default = () => <DynamicTypeIconsDemo />;
