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
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { HardcodedIcons } from '@kbn/workflows-ui';
import { GlobalWorkflowEditorStyles } from './global_workflow_editor_styles';
import { predefinedStepTypes, useDynamicTypeIcons } from './use_dynamic_type_icons';
import type { ConnectorsResponse } from '../../../entities/connectors/model/types';
import { mockUiSettingsService } from '../../../shared/mocks/mock_ui_settings_service';

type MockConnectorTypeInfo = Pick<ConnectorTypeInfo, 'actionTypeId' | 'displayName'>;

interface MockConnectorsResponse {
  connectorTypes: {
    [key: string]: MockConnectorTypeInfo;
  };
}

// Connectors whose icons ship in @kbn/connector-specs, so the story resolves the real
// ones. A representative slice rather than all 58 — the point is that resolution works.
const SPEC_CONNECTOR_TYPES: MockConnectorTypeInfo[] = [
  { actionTypeId: '.github', displayName: 'GitHub' },
  { actionTypeId: '.datadog', displayName: 'Datadog' },
  { actionTypeId: '.jenkins', displayName: 'Jenkins' },
  { actionTypeId: '.sentry', displayName: 'Sentry' },
  { actionTypeId: '.workday', displayName: 'Workday' },
  { actionTypeId: '.kubernetes', displayName: 'Kubernetes' },
  { actionTypeId: '.posthog', displayName: 'PostHog' },
  { actionTypeId: '.new_relic', displayName: 'New Relic' },
  { actionTypeId: '.zendesk', displayName: 'Zendesk' },
  { actionTypeId: '.google_drive', displayName: 'Google Drive' },
  { actionTypeId: '.microsoft-teams', displayName: 'Microsoft Teams' },
  { actionTypeId: '.jira-cloud', displayName: 'Jira Cloud' },
];

// Legacy connectors whose icons live in stack_connectors. That plugin can't be reached
// from a story, so these land on the plugs fallback here but render fine in Kibana.
const STACK_CONNECTOR_TYPES: MockConnectorTypeInfo[] = [
  { actionTypeId: '.slack', displayName: 'Slack' },
  { actionTypeId: '.slack_api', displayName: 'Slack API' },
  { actionTypeId: '.email', displayName: 'Email' },
  { actionTypeId: '.inference', displayName: 'Inference' },
  { actionTypeId: '.gen-ai', displayName: 'Gen AI' },
  { actionTypeId: '.bedrock', displayName: 'Bedrock' },
  { actionTypeId: '.gemini', displayName: 'Gemini' },
  { actionTypeId: '.servicenow', displayName: 'Service Now' },
  { actionTypeId: '.jira', displayName: 'Jira' },
  { actionTypeId: '.torq', displayName: 'Torq' },
  { actionTypeId: '.opsgenie', displayName: 'Opsgenie' },
  { actionTypeId: '.swimlane', displayName: 'Swimlane' },
];

const CONNECTOR_TYPES = [...SPEC_CONNECTOR_TYPES, ...STACK_CONNECTOR_TYPES];

const mockConnectorsResponse: MockConnectorsResponse = {
  connectorTypes: Object.fromEntries(CONNECTOR_TYPES.map((c) => [c.actionTypeId, c])),
};

// stack_connectors is what populates this registry in Kibana, and it isn't reachable
// from a story. `ConnectorIconsMap` carries the same lazy icon components, so seeding
// from it renders the real logos rather than a wall of identical plugs.
const createPopulatedActionTypeRegistry = () => {
  const registry = new TypeRegistry<ActionTypeModel>();
  for (const { actionTypeId } of CONNECTOR_TYPES) {
    registry.register({
      id: actionTypeId,
      iconClass: ConnectorIconsMap.get(actionTypeId) ?? 'plugs',
    } as unknown as ActionTypeModel);
  }
  return registry;
};

const decorator: Decorator = (story) => {
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
          } as unknown as Parameters<typeof KibanaContextProvider>[0]['services']
        }
      >
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
  ...CONNECTOR_TYPES.map(({ actionTypeId, displayName }) => ({
    actionTypeId: actionTypeId.slice(1),
    displayName,
  })),
];

const hasHardcodedIcon = (actionTypeId: string): boolean =>
  actionTypeId in HardcodedIcons || `.${actionTypeId}` in HardcodedIcons;

const withHardcodedIcons = allTypes.filter((t) => hasHardcodedIcon(t.actionTypeId));
const withSpecIcons = allTypes.filter(
  (t) => !hasHardcodedIcon(t.actionTypeId) && ConnectorIconsMap.has(`.${t.actionTypeId}`)
);
const withFallbackIcons = allTypes.filter(
  (t) => !hasHardcodedIcon(t.actionTypeId) && !ConnectorIconsMap.has(`.${t.actionTypeId}`)
);

const SectionHeading = ({ children, first }: { children: string; first?: boolean }) => (
  <EuiText size="xs" color="subdued" style={{ margin: first ? '0 0 4px' : '16px 0 4px' }}>
    <strong>{children}</strong>
  </EuiText>
);

const TypeChip = ({ actionTypeId }: { actionTypeId: string }) => (
  <span className={`type-inline-highlight type-${actionTypeId.replaceAll('.', '-')}`}>
    {actionTypeId}
  </span>
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
          <TypeChip key={t.actionTypeId} actionTypeId={t.actionTypeId} />
        ))}
        <SectionHeading>{'Connector spec icons (@kbn/connector-specs)'}</SectionHeading>
        {withSpecIcons.map((t) => (
          <TypeChip key={t.actionTypeId} actionTypeId={t.actionTypeId} />
        ))}
        <SectionHeading>
          {'Stack connector icons (plugs here, real icons in Kibana)'}
        </SectionHeading>
        {withFallbackIcons.map((t) => (
          <TypeChip key={t.actionTypeId} actionTypeId={t.actionTypeId} />
        ))}
      </div>
    </div>
  );
};

export const Default = () => <DynamicTypeIconsDemo />;
