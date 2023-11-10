/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useAppContext } from '../../context/app_context';
import { useGetAiConnectors } from '../../hooks/use_get_ai_connectors';

export const SELECTED_CONNECTOR_LOCAL_STORAGE_KEY =
  'xpack.observabilityAiAssistant.lastUsedConnector';

export function SettingsTab() {
  const { navigateToApp } = useAppContext();

  const { connectors = [] } = useGetAiConnectors();

  const [selectedConnector, setSelectedConnector] = useLocalStorage(
    SELECTED_CONNECTOR_LOCAL_STORAGE_KEY,
    ''
  );

  const selectorOptions = connectors.map((connector) => ({
    text: connector.name,
    value: connector.id,
  }));

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

  return (
    <>
      <EuiPanel hasBorder grow={false}>
        <EuiForm component="form">
          <EuiDescribedFormGroup
            fullWidth
            title={
              <h3>
                {i18n.translate('aiAssistantManagement.settingsPage.showAIAssistantButtonLabel', {
                  defaultMessage:
                    'Show AI Assistant button and Contextual Insights in Observability apps',
                })}
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
                  {i18n.translate('aiAssistantManagement.settingsPage.goToConnectorsButtonLabel', {
                    defaultMessage: 'Go to connectors',
                  })}
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
                onChange={(e) => {
                  setSelectedConnector(e.target.value);
                }}
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
  );
}
