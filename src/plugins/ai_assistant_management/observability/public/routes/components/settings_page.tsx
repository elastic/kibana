/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useAppContext } from '../../context/app_context';
import { useGetAiConnectors } from '../../hooks/use_get_ai_connectors';

export const SELECTED_CONNECTOR_LOCAL_STORAGE_KEY =
  'xpack.observabilityAiAssistant.lastUsedConnector';

export function SettingsPage() {
  const { navigateToApp, serverless, setBreadcrumbs } = useAppContext();

  const [selectedConnector, setSelectedConnector] = useLocalStorage(
    SELECTED_CONNECTOR_LOCAL_STORAGE_KEY,
    ''
  );

  const { connectors = [] } = useGetAiConnectors();

  useEffect(() => {
    if (serverless) {
      serverless.setBreadcrumbs([
        {
          text: i18n.translate(
            'aiAssistantManagmentObservability.breadcrumb.serverless.observability',
            {
              defaultMessage: 'AI Assistant for Observability Settings',
            }
          ),
        },
      ]);
    } else {
      setBreadcrumbs([
        {
          text: i18n.translate('aiAssistantManagmentObservability.breadcrumb.index', {
            defaultMessage: 'AI Assistants',
          }),
          onClick: (e) => {
            e.preventDefault();
            navigateToApp('management', { path: '/kibana/aiAssistantManagement' });
          },
        },
        {
          text: i18n.translate('aiAssistantManagmentObservability.breadcrumb.observability', {
            defaultMessage: 'Observability',
          }),
        },
      ]);
    }
  }, [navigateToApp, serverless, setBreadcrumbs]);

  const handleNavigateToConnectors = () => {
    navigateToApp('management', {
      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
    });
  };

  const handleNavigateToSpacesConfiguration = () => {
    navigateToApp('management', {
      path: '/spaces',
    });
  };

  const selectorOptions = connectors.map((connector) => ({
    text: connector.name,
    value: connector.id,
  }));

  const tabs = [
    {
      id: 'settings',
      name: i18n.translate('aiAssistantManagement.settingsPage.settingsLabel', {
        defaultMessage: 'Settings',
      }),
      content: (
        <>
          <EuiPanel hasBorder grow={false}>
            <EuiForm component="form">
              <EuiDescribedFormGroup
                fullWidth
                title={
                  <h3>
                    {i18n.translate(
                      'aiAssistantManagement.settingsPage.showAIAssistantButtonLabel',
                      {
                        defaultMessage:
                          'Show AI Assistant button and Contextual Insights in Observability apps',
                      }
                    )}
                  </h3>
                }
                description={
                  <p>
                    {i18n.translate(
                      'aiAssistantManagement.settingsPage.showAIAssistantDescriptionLabel',
                      {
                        defaultMessage:
                          'Toggle the AI Assistant button and Contextual Insights on or off in Observability apps by checking or unchecking the AI Assistant feature in Spaces > <your space> > Features.',
                      }
                    )}
                  </p>
                }
              >
                <EuiFormRow fullWidth>
                  <div css={{ textAlign: 'right' }}>
                    <EuiButton onClick={handleNavigateToSpacesConfiguration}>
                      {i18n.translate(
                        'aiAssistantManagement.settingsPage.goToFeatureControlsButtonLabel',
                        { defaultMessage: 'Go to Spaces' }
                      )}
                    </EuiButton>
                  </div>
                </EuiFormRow>
              </EuiDescribedFormGroup>
            </EuiForm>
          </EuiPanel>

          <EuiSpacer size="l" />

          <EuiPanel hasBorder grow={false}>
            <EuiForm component="form">
              <EuiDescribedFormGroup
                fullWidth
                title={
                  <h3>
                    {i18n.translate('aiAssistantManagement.settingsPage.connectorSettingsLabel', {
                      defaultMessage: 'Connector settings',
                    })}
                  </h3>
                }
                description={i18n.translate(
                  'aiAssistantManagement.settingsPage.euiDescribedFormGroup.inOrderToUseLabel',
                  {
                    defaultMessage:
                      'In order to use the Observability AI Assistant you must set up a Generative AI connector.',
                  }
                )}
              >
                <EuiFormRow fullWidth>
                  <div css={{ textAlign: 'right' }}>
                    <EuiButton onClick={handleNavigateToConnectors}>
                      {i18n.translate(
                        'aiAssistantManagement.settingsPage.goToConnectorsButtonLabel',
                        {
                          defaultMessage: 'Go to connectors',
                        }
                      )}
                    </EuiButton>
                  </div>
                </EuiFormRow>
              </EuiDescribedFormGroup>

              <EuiDescribedFormGroup
                fullWidth
                title={
                  <h3>
                    {i18n.translate(
                      'aiAssistantManagement.settingsPage.h4.selectDefaultConnectorLabel',
                      { defaultMessage: 'Default connector' }
                    )}
                  </h3>
                }
                description={i18n.translate(
                  'aiAssistantManagement.settingsPage.connectYourElasticAITextLabel',
                  {
                    defaultMessage:
                      'Select the Generative AI connector you want to use as the default for the Observability AI Assistant.',
                  }
                )}
              >
                <EuiFormRow
                  fullWidth
                  label={i18n.translate('aiAssistantManagement.settingsPage.selectConnectorLabel', {
                    defaultMessage: 'Select connector',
                  })}
                >
                  <EuiSelect
                    id={'generativeAIProvider'}
                    options={selectorOptions}
                    value={selectedConnector}
                    onChange={(e) => {}}
                    aria-label={i18n.translate(
                      'aiAssistantManagement.settingsPage.euiSelect.generativeAIProviderLabel',
                      { defaultMessage: 'Generative AI provider' }
                    )}
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>
            </EuiForm>
          </EuiPanel>
        </>
      ),
    },
    {
      id: 'kb',
      name: i18n.translate('aiAssistantManagement.settingsPage.knowledgeBaseLabel', {
        defaultMessage: 'Knowledge base',
      }),
      content: (
        <>
          <EuiText />
        </>
      ),
    },
  ];

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  return (
    <>
      <EuiTitle size="l">
        <h2>
          {i18n.translate('aiAssistantManagement.settingsPage.h2.settingsLabel', {
            defaultMessage: 'Settings',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiTabs>
        {tabs.map((tab, index) => (
          <EuiTab
            key={index}
            onClick={() => onSelectedTabChanged(tab.id)}
            isSelected={tab.id === selectedTabId}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>

      <EuiSpacer size="l" />

      {selectedTabContent}

      <EuiSpacer size="l" />
    </>
  );
}
