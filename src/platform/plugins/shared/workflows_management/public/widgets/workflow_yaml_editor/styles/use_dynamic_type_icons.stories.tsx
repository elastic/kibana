/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGrid, EuiFlexItem, EuiText } from '@elastic/eui';
import type { Decorator } from '@storybook/react';
import React from 'react';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import { connectorsSpecs } from '@kbn/connector-specs';
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

// Every connector spec, with the icon resolved exactly as `transformSpecToActionTypeModel`
// does it in Kibana — no placeholders, so a blank chip here is a real broken icon.
//
// Legacy connector types (.slack, .jira, .torq, …) are absent: their icons live in
// stack_connectors, which this plugin's type graph doesn't reference, and reaching into
// it emits declaration files across that plugin's source tree. Showing them as plugs
// would say nothing, so they're left out rather than faked.
const connectorTypeRegistry = new TypeRegistry<ActionTypeModel>();

for (const { metadata } of Object.values(connectorsSpecs)) {
  const { id, displayName, icon } = metadata;
  connectorTypeRegistry.register({
    id,
    actionTypeTitle: displayName,
    iconClass: icon ?? ConnectorIconsMap.get(id) ?? 'plugs',
  } as unknown as ActionTypeModel);
}

const CONNECTOR_TYPES: MockConnectorTypeInfo[] = connectorTypeRegistry
  .list()
  .map(({ id, actionTypeTitle }) => ({ actionTypeId: id, displayName: actionTypeTitle ?? id }))
  .sort((a, b) => a.actionTypeId.localeCompare(b.actionTypeId));

const mockConnectorsResponse: MockConnectorsResponse = {
  connectorTypes: Object.fromEntries(CONNECTOR_TYPES.map((c) => [c.actionTypeId, c])),
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
              actionTypeRegistry: connectorTypeRegistry,
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
  title: 'Workflows Icons/Editor',
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
const withConnectorIcons = allTypes.filter((t) => !hasHardcodedIcon(t.actionTypeId));

const SectionHeading = ({ children, first }: { children: string; first?: boolean }) => (
  <EuiText size="xs" color="subdued" style={{ margin: first ? '0 0 12px' : '16px 0 12px' }}>
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
      <SectionHeading first>{'Hardcoded icons (bundled SVGs)'}</SectionHeading>
      <EuiFlexGrid columns={3} gutterSize="s">
        {withHardcodedIcons.map((t) => (
          <EuiFlexItem key={t.actionTypeId}>
            <div css={{ position: 'relative', height: '20px' }}>
              <div className="view-line">
                <TypeChip actionTypeId={t.actionTypeId} />
              </div>
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>

      <SectionHeading>
        {`Connector icons from the action type registry (${withConnectorIcons.length})`}
      </SectionHeading>
      <EuiFlexGrid columns={3} gutterSize="s">
        {withConnectorIcons.map((t) => (
          <EuiFlexItem key={t.actionTypeId}>
            <div css={{ position: 'relative', height: '20px' }}>
              <div className="view-line">
                <TypeChip actionTypeId={t.actionTypeId} />
              </div>
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </div>
  );
};

export const Default = () => <DynamicTypeIconsDemo />;
